<#
  一键同步最新代码到 GitHub

  用法：
    .\sync-to-github.ps1
    .\sync-to-github.ps1 -RepoUrl https://github.com/用户名/仓库.git
    .\sync-to-github.ps1 -Message "feat: 新增调音器"

  也可以直接双击 sync-to-github.bat。

  首次运行会做的事：
    1. 检查 git，没有则引导用 winget 安装
    2. 没有 .git 就 git init
    3. 没有 origin 就提示输入仓库地址并绑定
    4. 暂存全部改动并提交（没有改动则跳过）
    5. 推送到当前分支，失败时自动 rebase 重试一次
#>
[CmdletBinding()]
param(
  [string]$RepoUrl = '',
  [string]$Message = '',
  [string]$Branch  = ''
)

# 注意：这里不能用 Stop。git 会把进度信息写到 stderr，
# 在 Stop 模式下会被 PowerShell 当成异常直接中断脚本。
$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Note { param([string]$Text) Write-Host "    [!] $Text" -ForegroundColor Yellow }

function Find-Git {
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "$env:ProgramFiles\Git\cmd\git.exe",
    "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }

  # 刚装完 Git 时当前会话的 PATH 还是旧的，从注册表重新读一次
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machinePath;$userPath"
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

# ---------- 1. 准备 git ----------
Write-Step '检查 Git 环境'
$git = Find-Git
if (-not $git) {
  Write-Note '未检测到 Git'
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Host '请先安装 Git：https://git-scm.com/download/win' -ForegroundColor Red
    exit 1
  }
  $answer = Read-Host '是否现在通过 winget 安装 Git？(Y/n)'
  if ($answer -and $answer.Trim().ToLower().StartsWith('n')) {
    Write-Host '已取消。' -ForegroundColor Red
    exit 1
  }
  & winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Git 安装失败，请手动安装后重试：https://git-scm.com/download/win' -ForegroundColor Red
    exit 1
  }
  $git = Find-Git
  if (-not $git) {
    Write-Host 'Git 安装完成但当前窗口读不到，请关闭后重新运行脚本。' -ForegroundColor Red
    exit 1
  }
}
Write-Ok (& $git --version)

# ---------- 2. 定位仓库 ----------
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-Step "工作目录：$root"

if (-not (Test-Path (Join-Path $root '.git'))) {
  Write-Note '尚未初始化仓库，正在执行 git init'
  & $git init -b main
  if ($LASTEXITCODE -ne 0) { & $git init }
  Write-Ok '本地仓库已创建'
}

# ---------- 3. 绑定远端 ----------
Write-Step '检查远端 origin'
$origin = ''
try { $origin = (& $git remote get-url origin 2>$null) } catch { $origin = '' }
if (-not $origin) {
  while (-not $RepoUrl) {
    $RepoUrl = Read-Host '请输入 GitHub 仓库地址（形如 https://github.com/用户名/仓库.git）'
    if ($RepoUrl) { $RepoUrl = $RepoUrl.Trim() }
  }
  & $git remote add origin $RepoUrl
  if ($LASTEXITCODE -ne 0) {
    Write-Host '绑定远端失败，请检查仓库地址。' -ForegroundColor Red
    exit 1
  }
  $origin = $RepoUrl
  Write-Ok "已绑定 origin：$origin"
} else {
  Write-Ok "origin：$origin"
}

# ---------- 4. 提交身份 ----------
$userName = ''
$userEmail = ''
try { $userName = (& $git config user.name 2>$null) } catch { }
try { $userEmail = (& $git config user.email 2>$null) } catch { }
if (-not $userName -or -not $userEmail) {
  Write-Note '尚未配置提交身份，仅写入当前仓库（不改全局配置）'
  if (-not $userName) {
    $userName = (Read-Host '提交署名（GitHub 用户名）').Trim()
    if ($userName) { & $git config --local user.name $userName }
  }
  if (-not $userEmail) {
    $userEmail = (Read-Host '提交邮箱（GitHub 邮箱）').Trim()
    if ($userEmail) { & $git config --local user.email $userEmail }
  }
}

# ---------- 5. 确定分支 ----------
$current = ''
try { $current = (& $git rev-parse --abbrev-ref HEAD 2>$null) } catch { $current = '' }
if (-not $current -or $current -eq 'HEAD') {
  $current = if ($Branch) { $Branch } else { 'main' }
  & $git checkout -b $current
  if ($LASTEXITCODE -ne 0) {
    Write-Host "创建分支 $current 失败。" -ForegroundColor Red
    exit 1
  }
}
Write-Ok "当前分支：$current"

# ---------- 6. 提交改动 ----------
Write-Step '暂存并提交改动'
& $git add -A
$staged = @(& $git diff --cached --name-only)
if ($staged.Count -eq 0) {
  Write-Note '没有新的改动，跳过提交'
} else {
  if (-not $Message) {
    $Message = "chore: 同步更新 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  }
  & $git commit -m $Message
  if ($LASTEXITCODE -ne 0) {
    Write-Host '提交失败，请查看上方 Git 输出。' -ForegroundColor Red
    exit 1
  }
  Write-Ok ("已提交 {0} 个文件：{1}" -f $staged.Count, $Message)
}

# ---------- 7. 推送 ----------
Write-Step "推送到 $origin ($current)"
& $git push -u origin $current 2>&1 | Out-Host
$pushed = ($LASTEXITCODE -eq 0)

if (-not $pushed) {
  Write-Note '推送被拒绝，尝试 rebase 合并远端历史后重试'
  & $git pull --rebase origin $current 2>&1 | Out-Host
  if ($LASTEXITCODE -eq 0) {
    & $git push -u origin $current 2>&1 | Out-Host
    $pushed = ($LASTEXITCODE -eq 0)
  }
}

if (-not $pushed) {
  Write-Host "`n同步失败，常见原因：" -ForegroundColor Red
  Write-Host '  1. 远端与本地历史无关联（远端仓库先建了 README）：'
  Write-Host "     git pull --rebase origin $current --allow-unrelated-histories   然后重新运行脚本"
  Write-Host '  2. 认证失败：确认已登录 GitHub，或使用 Personal Access Token 作为密码'
  Write-Host '  3. 网络问题：检查代理 / 网络连通性'
  exit 1
}

$webUrl = $origin -replace '\.git$', '' -replace '^git@github\.com:', 'https://github.com/'
Write-Ok "同步完成：$webUrl/tree/$current"

$dirty = @(& $git status --porcelain)
if ($dirty.Count -gt 0) {
  Write-Note "仍有未提交内容：$($dirty.Count) 项"
}

exit 0
