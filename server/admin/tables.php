<?php
/**
 * 后台表配置：驱动通用 CRUD。
 * 每个模块可含多张子表（用 sub= 参数切换，渲染为标签页）。
 * field.type: text|number|textarea|select|bool|tags|json|image|readonly
 *   select.options: 数组 [value=>label] 或字符串 '@表名'（取 id=>name/title）
 *   tags: 逗号分隔输入，存为 JSON 数组
 *   json: 原始 JSON 文本框
 */
function admin_modules(): array {
    static $m = null;
    if ($m !== null) return $m;

    $F = function ($name, $label, $type = 'text', $extra = []) {
        return array_merge(compact('name', 'label', 'type'), $extra);
    };

    $m = [
        'albums' => ['title' => '专辑', 'icon' => '💿', 'tables' => [[
            'key' => 'albums', 'title' => '专辑', 'table' => 'albums', 'pk' => 'id', 'id_type' => 'text',
            'list' => [['id', 'ID'], ['name', '名称'], ['year', '年份'], ['type', '类型'], ['sort', '排序']],
            'fields' => [
                $F('id', 'ID', 'text', ['required' => true]),
                $F('name', '名称', 'text', ['required' => true]),
                $F('year', '年份', 'number'),
                $F('date', '发行日期', 'text'),
                $F('type', '类型', 'select', ['options' => ['studio' => '录音室专辑', 'live' => '现场专辑', 'ep' => 'EP', 'single' => '单曲', 'compilation' => '合辑', 'ost' => '原声']]),
                $F('description', '简介', 'textarea'),
                $F('cover', '封面图', 'image'),
                $F('sort', '排序', 'number', ['default' => 0]),
            ],
        ]]],

        'songs' => ['title' => '曲目', 'icon' => '🎵', 'tables' => [[
            'key' => 'songs', 'title' => '曲目', 'table' => 'songs', 'pk' => 'id', 'id_type' => 'text',
            'list' => [['id', 'ID'], ['title', '曲名'], ['album_id', '专辑'], ['duration', '时长'], ['play_count', '播放'], ['city', '城市'], ['sort', '排序']],
            'fields' => [
                $F('id', 'ID', 'text', ['required' => true]),
                $F('title', '曲名', 'text', ['required' => true]),
                $F('album_id', '所属专辑', 'select', ['options' => '@albums']),
                $F('track_no', '专辑内序号', 'number'),
                $F('duration', '时长(秒)', 'number'),
                $F('audio_url', '音频地址', 'image'),
                $F('lyrics', '歌词', 'textarea'),
                $F('bpm', 'BPM', 'number'),
                $F('song_key', '原调', 'text'),
                $F('capo', 'Capo 品', 'number'),
                $F('difficulty', '难度', 'select', ['options' => ['0' => '0', '1' => '1', '2' => '2', '3' => '3', '4' => '4', '5' => '5']]),
                $F('tags', '标签(逗号分隔)', 'tags'),
                $F('play_count', '播放量', 'number', ['default' => 0]),
                $F('year', '年份', 'number'),
                $F('city', '城市', 'text'),
                $F('sort', '排序', 'number', ['default' => 0]),
            ],
        ]]],

        'videos' => ['title' => '视频', 'icon' => '🎬', 'tables' => [[
            'key' => 'videos', 'title' => '视频', 'table' => 'videos', 'pk' => 'id', 'id_type' => 'text',
            'list' => [['id', 'ID'], ['title', '标题'], ['category', '分类'], ['year', '年份'], ['views', '播放'], ['sort', '排序']],
            'fields' => [
                $F('id', 'ID', 'text', ['required' => true]),
                $F('title', '标题', 'text', ['required' => true]),
                $F('video_url', '视频地址', 'image'),
                $F('poster', '封面图', 'image'),
                $F('duration', '时长(秒)', 'number'),
                $F('category', '分类', 'select', ['options' => ['mv' => 'MV', 'live' => '现场', 'documentary' => '纪录片', 'behind' => '花絮', 'other' => '其它']]),
                $F('year', '年份', 'number'),
                $F('city', '城市', 'text'),
                $F('related_song_id', '关联曲目', 'select', ['options' => '@songs']),
                $F('description', '简介', 'textarea'),
                $F('views', '播放量', 'number', ['default' => 0]),
                $F('sort', '排序', 'number', ['default' => 0]),
            ],
        ]]],

        'shorts' => ['title' => '短视频', 'icon' => '📱', 'tables' => [[
            'key' => 'shorts', 'title' => '短视频', 'table' => 'shorts', 'pk' => 'id', 'id_type' => 'text',
            'list' => [['id', 'ID'], ['title', '标题'], ['author', '作者'], ['likes', '赞'], ['views', '播放'], ['sort', '排序']],
            'fields' => [
                $F('id', 'ID', 'text', ['required' => true]),
                $F('title', '标题', 'text', ['required' => true]),
                $F('author', '作者', 'text'),
                $F('desc', '描述', 'textarea'),
                $F('tags', '标签(逗号分隔)', 'tags'),
                $F('city', '城市', 'text'),
                $F('duration', '时长(秒)', 'number'),
                $F('song', '配乐', 'text'),
                $F('video_url', '视频地址', 'image'),
                $F('poster', '封面图', 'image'),
                $F('likes', '点赞数', 'number', ['default' => 0]),
                $F('comments', '评论数', 'number', ['default' => 0]),
                $F('saves', '收藏数', 'number', ['default' => 0]),
                $F('views', '播放数', 'number', ['default' => 0]),
                $F('sort', '排序', 'number', ['default' => 0]),
            ],
        ]]],

        'chords' => ['title' => '和弦工具', 'icon' => '🎸', 'tables' => [
            ['key' => 'library', 'title' => '和弦库', 'table' => 'chord_library', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['name', '名称'], ['display', '显示'], ['root_string', '根音弦'], ['quality', '性质'], ['sort', '排序']],
             'fields' => [
                $F('name', '名称(如 C)', 'text', ['required' => true]),
                $F('display', '显示名', 'text'),
                $F('frets', '品位(JSON 数组)', 'json'),
                $F('fingers', '指法(JSON 数组)', 'json'),
                $F('root_string', '根音弦', 'number'),
                $F('quality', '性质', 'text'),
                $F('sort', '排序', 'number', ['default' => 0]),
             ]],
            ['key' => 'sheets', 'title' => '六线谱', 'table' => 'chord_sheets', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['song_id', '曲目'], ['updated_at', '更新时间']],
             'fields' => [
                $F('song_id', '曲目 ID', 'text', ['required' => true]),
                $F('data', '谱面数据(JSON)', 'json'),
             ]],
            ['key' => 'progressions', 'title' => '和弦走向', 'table' => 'progressions', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['name', '名称'], ['roman', '级数'], ['example', '示例'], ['sort', '排序']],
             'fields' => [
                $F('name', '名称', 'text', ['required' => true]),
                $F('roman', '级数', 'text'),
                $F('degrees', '度数(JSON 数组)', 'json'),
                $F('example', '示例', 'text'),
                $F('hint', '提示', 'text'),
                $F('sort', '排序', 'number', ['default' => 0]),
             ]],
            ['key' => 'scale', 'title' => '难度刻度', 'table' => 'difficulty_scale', 'pk' => 'level', 'id_type' => 'text',
             'list' => [['level', '等级'], ['label', '标签'], ['desc', '说明']],
             'fields' => [
                $F('level', '等级(0-5)', 'number', ['required' => true]),
                $F('label', '标签', 'text'),
                $F('desc', '说明', 'text'),
             ]],
        ]],

        'bio' => ['title' => '人物百科', 'icon' => '👤', 'tables' => [
            ['key' => 'profile', 'title' => '个人资料', 'table' => 'bio_profile', 'pk' => 'id', 'id_type' => 'single',
             'fields' => [$F('data', '资料(JSON)', 'json')]],
            ['key' => 'facts', 'title' => '基本信息', 'table' => 'bio_facts', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['label', '项'], ['value', '值'], ['note', '备注'], ['sort', '排序']],
             'fields' => [$F('label', '项', 'text', ['required' => true]), $F('value', '值', 'text', ['required' => true]), $F('note', '备注', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'chapters', 'title' => '分章简介', 'table' => 'bio_chapters', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['title', '标题'], ['sort', '排序']],
             'fields' => [$F('title', '标题', 'text', ['required' => true]), $F('paras', '段落(JSON 字符串数组)', 'json'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'members', 'title' => '乐队成员', 'table' => 'bio_band_members', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['name', '姓名'], ['instrument', '乐器'], ['since', '时间'], ['sort', '排序']],
             'fields' => [$F('name', '姓名', 'text', ['required' => true]), $F('instrument', '乐器', 'text'), $F('since', '时间', 'text'), $F('note', '备注', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'faqs', 'title' => '常见问题', 'table' => 'bio_faqs', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['q', '问题'], ['sort', '排序']],
             'fields' => [$F('q', '问题', 'text', ['required' => true]), $F('a', '回答', 'textarea'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'awards', 'title' => '奖项荣誉', 'table' => 'bio_awards', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['year', '年份'], ['name', '名称'], ['sort', '排序']],
             'fields' => [$F('year', '年份', 'text'), $F('name', '名称', 'text', ['required' => true]), $F('note', '备注', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
        ]],

        'tour' => ['title' => '叁叁肆巡演', 'icon' => '🗺️', 'tables' => [
            ['key' => 'config', 'title' => '巡演配置', 'table' => 'tour_config', 'pk' => 'id', 'id_type' => 'single',
             'fields' => [$F('target', '目标城市数', 'number', ['default' => 334]), $F('name', '巡演名称', 'text'), $F('slogan', '标语', 'text')]],
            ['key' => 'cities', 'title' => '城市清单', 'table' => 'tour_cities', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['city', '城市'], ['province', '省份'], ['year', '年份'], ['venue', '场馆'], ['done', '已完成'], ['sort', '排序']],
             'fields' => [$F('city', '城市', 'text', ['required' => true]), $F('province', '省份', 'text', ['required' => true]), $F('year', '年份', 'number'), $F('venue', '场馆', 'text'), $F('done', '已完成', 'bool'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'timeline', 'title' => '大事记', 'table' => 'tour_timeline', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['date', '日期'], ['year', '年'], ['title', '标题'], ['kind', '类型'], ['sort', '排序']],
             'fields' => [$F('date', '日期', 'text'), $F('year', '年', 'number'), $F('title', '标题', 'text', ['required' => true]), $F('text', '内容', 'textarea'), $F('kind', '类型', 'select', ['options' => ['show' => '演出', 'release' => '发行', 'award' => '获奖', 'media' => '媒体', 'other' => '其它']]), $F('sort', '排序', 'number', ['default' => 0])]],
        ]],

        'sponsors' => ['title' => '赞助', 'icon' => '💝', 'tables' => [
            ['key' => 'tiers', 'title' => '赞助档位', 'table' => 'sponsor_tiers', 'pk' => 'id', 'id_type' => 'text',
             'list' => [['id', 'ID'], ['name', '名称'], ['amount', '金额'], ['featured', '推荐'], ['sort', '排序']],
             'fields' => [$F('id', 'ID', 'text', ['required' => true]), $F('name', '名称', 'text', ['required' => true]), $F('icon', '图标', 'text'), $F('amount', '金额', 'number'), $F('benefits', '权益(JSON 数组)', 'json'), $F('featured', '推荐档位', 'bool'), $F('accent', '强调色', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'channels', 'title' => '收款渠道', 'table' => 'sponsor_channels', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['code', '标识'], ['label', '名称'], ['sort', '排序']],
             'fields' => [$F('code', '标识', 'text', ['required' => true]), $F('label', '名称', 'text', ['required' => true]), $F('hint', '提示', 'text'), $F('qr_image', '二维码图', 'image'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'wall', 'title' => '留言墙', 'table' => 'sponsor_wall', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['nick', '昵称'], ['tier', '档位'], ['amount', '金额'], ['date', '日期'], ['sort', '排序']],
             'fields' => [$F('nick', '昵称', 'text', ['required' => true]), $F('tier', '档位', 'text'), $F('amount', '金额', 'number'), $F('date', '日期', 'text'), $F('words', '留言', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'stats', 'title' => '数据展示', 'table' => 'sponsor_stats', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['label', '项'], ['value', '值'], ['sort', '排序']],
             'fields' => [$F('label', '项', 'text', ['required' => true]), $F('value', '值', 'text', ['required' => true]), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'usecases', 'title' => '资金去向', 'table' => 'sponsor_use_cases', 'pk' => 'id', 'id_type' => 'auto',
             'list' => [['id', '#'], ['title', '标题'], ['sort', '排序']],
             'fields' => [$F('title', '标题', 'text', ['required' => true]), $F('text', '说明', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
        ]],

        'quotes' => ['title' => '语录', 'icon' => '💬', 'tables' => [[
            'key' => 'quotes', 'title' => '语录', 'table' => 'quotes', 'pk' => 'id', 'id_type' => 'auto',
            'list' => [['id', '#'], ['text', '内容'], ['source', '来源'], ['sort', '排序']],
            'fields' => [$F('text', '内容', 'text', ['required' => true]), $F('source', '来源', 'text'), $F('sort', '排序', 'number', ['default' => 0])]],
        ]],

        'banners' => ['title' => '首页横幅', 'icon' => '🖼️', 'tables' => [[
            'key' => 'banners', 'title' => '横幅', 'table' => 'banners', 'pk' => 'id', 'id_type' => 'auto',
            'list' => [['id', '#'], ['kicker', '前缀'], ['title', '标题'], ['hue', '色'], ['sort', '排序']],
            'fields' => [$F('kicker', '前缀文字', 'text'), $F('title', '标题', 'text', ['required' => true]), $F('desc', '描述', 'text'), $F('song_id', '关联曲目', 'select', ['options' => '@songs']), $F('link_to', '跳转链接', 'text'), $F('image', '图片', 'image'), $F('hue', '色相(0-360)', 'number', ['default' => 0]), $F('sort', '排序', 'number', ['default' => 0])]],
        ]],

        'achievements' => ['title' => '成就', 'icon' => '🏆', 'tables' => [
            ['key' => 'achievements', 'title' => '成就', 'table' => 'achievements', 'pk' => 'id', 'id_type' => 'text',
             'list' => [['id', 'ID'], ['icon', '图标'], ['name', '名称'], ['metric', '指标'], ['threshold', '阈值'], ['sort', '排序']],
             'fields' => [$F('id', 'ID', 'text', ['required' => true]), $F('icon', '图标', 'text'), $F('name', '名称', 'text', ['required' => true]), $F('hint', '提示', 'text'), $F('metric', '统计指标', 'select', ['options' => ['playCount' => '总播放次数', 'playedIds' => '播放过的曲目数', 'totalSeconds' => '总收听秒数', 'favoriteCount' => '收藏数', 'albumCoverage' => '完整专辑数', 'completedSongs' => '完整听完数', 'unlockedKeys' => 'Capo 计算次数', 'nightPlays' => '深夜播放次数', 'consecutiveDays' => '连续打卡天数', 'easterEgg' => '彩蛋触发']]), $F('threshold', '阈值', 'number', ['default' => 1]), $F('sort', '排序', 'number', ['default' => 0])]],
            ['key' => 'easter', 'title' => '彩蛋配置', 'table' => 'easter_eggs', 'pk' => 'id', 'id_type' => 'single',
             'fields' => [$F('data', '彩蛋配置(JSON，含 rainSongIds 数组、birthdayNote 等)', 'json')]],
        ]],

        'nav' => ['title' => '导航', 'icon' => '🧭', 'tables' => [[
            'key' => 'nav', 'title' => '导航项', 'table' => 'nav_items', 'pk' => 'id', 'id_type' => 'auto',
            'list' => [['id', '#'], ['to', '路径'], ['label', '名称'], ['icon', '图标'], ['group', '分组'], ['visible', '显示'], ['sort', '排序']],
            'fields' => [$F('to', '路径', 'text', ['required' => true]), $F('label', '名称', 'text', ['required' => true]), $F('icon', '图标', 'text'), $F('desc', '描述', 'text'), $F('group', '分组', 'select', ['options' => ['main' => '主导航', 'lib' => '我的库']]), $F('visible', '显示', 'bool', ['default' => true]), $F('sort', '排序', 'number', ['default' => 0])]],
        ]],
    ];

    return $m;
}
