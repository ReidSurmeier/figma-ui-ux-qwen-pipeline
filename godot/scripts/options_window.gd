extends Control

const EXPANDED_SIZE := Vector2(280, 122)
const MINIMIZED_SIZE := Vector2(180, 18)
const VIEWPORT_SIZE := Vector2(849, 564)
const ASSET_ROOT := "res://assets/options/"
const COMPONENT_ROOT := ASSET_ROOT + "components/"

var bgm := 62
var effect := 43
var bgm_on := false
var effect_on := true
var footer := {"opaque": false, "attack": true, "skill": false, "item": true}
var active_tab := "option"
var skin := ""
var skin_open := false
var minimized := false
var dragging_slider := ""
var dragging_window := false
var drag_offset := Vector2.ZERO
var animation_start_size := EXPANDED_SIZE
var animation_end_size := EXPANDED_SIZE

var expanded_nodes: Array[CanvasItem] = []
var visuals := {}
var hits := {}
var hit_visuals := {}
var skin_menu: Control
var skin_value: Label
var info_panel: Control
var minimized_plate: TextureRect

func _ready() -> void:
	size = EXPANDED_SIZE
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_visuals()
	_build_hits()
	_update_all_visuals()
	_publish_qa()

func _texture_node(node_name: String, path: String, at: Vector2, parent: Node = self) -> TextureRect:
	var node := TextureRect.new()
	node.name = node_name
	node.texture = load(path)
	node.position = at
	node.size = node.texture.get_size()
	node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	node.stretch_mode = TextureRect.STRETCH_SCALE
	node.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(node)
	return node

func _transparent_button(node_name: String, at: Vector2, dimensions: Vector2, callback: Callable) -> Button:
	var button := Button.new()
	button.name = node_name
	button.position = at
	button.size = dimensions
	button.flat = true
	button.focus_mode = Control.FOCUS_ALL
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	button.add_theme_stylebox_override("hover", StyleBoxEmpty.new())
	button.add_theme_stylebox_override("pressed", StyleBoxEmpty.new())
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	button.pressed.connect(callback)
	add_child(button)
	return button

func _wire_press_visual(button: BaseButton, visual: CanvasItem) -> void:
	hit_visuals[button.name] = visual
	button.button_down.connect(func() -> void: visual.modulate = Color(0.72, 0.72, 0.72, 1.0))
	button.button_up.connect(func() -> void: visual.modulate = Color.WHITE)

func _build_visuals() -> void:
	var edge_underlay := Polygon2D.new()
	edge_underlay.name = "RoundedEdgeUnderlay"
	edge_underlay.polygon = PackedVector2Array([
		Vector2(5, 0), Vector2(275, 0), Vector2(276, 1), Vector2(278, 2),
		Vector2(278, 4), Vector2(279, 4), Vector2(280, 6), Vector2(280, 116),
		Vector2(279, 118), Vector2(278, 118), Vector2(278, 120), Vector2(276, 121),
		Vector2(275, 122), Vector2(5, 122), Vector2(4, 121), Vector2(2, 120),
		Vector2(2, 118), Vector2(1, 118), Vector2(0, 116), Vector2(0, 6),
		Vector2(1, 4), Vector2(2, 4), Vector2(2, 2), Vector2(4, 1),
	])
	edge_underlay.color = Color("#624b62")
	add_child(edge_underlay)
	visuals.plate = _texture_node("CleanPlate", ASSET_ROOT + "clean-plate-alpha-edge.png", Vector2.ZERO)
	expanded_nodes.append(visuals.plate)

	visuals.option_tab = _texture_node("OptionTab", COMPONENT_ROOT + "tab-option.png", Vector2(5, 18))
	visuals.info_tab = _texture_node("InfoTab", COMPONENT_ROOT + "tab-info.png", Vector2(5, 55))
	for node in [visuals.option_tab, visuals.info_tab]: expanded_nodes.append(node)

	visuals.bgm_label = _texture_node("BgmLabel", COMPONENT_ROOT + "bgm-label.png", Vector2(27, 20))
	visuals.effect_label = _texture_node("EffectLabel", COMPONENT_ROOT + "effect-label.png", Vector2(27, 43))
	visuals.skin_label = _texture_node("SkinLabel", COMPONENT_ROOT + "skin-label.png", Vector2(27, 68))
	visuals.bgm_left = _texture_node("BgmLeft", COMPONENT_ROOT + "slider-left-arrow.png", Vector2(74, 20))
	visuals.bgm_track = _texture_node("BgmTrack", COMPONENT_ROOT + "slider-track.png", Vector2(83, 24))
	visuals.bgm_thumb = _texture_node("BgmThumb", COMPONENT_ROOT + "slider-thumb.png", Vector2.ZERO)
	visuals.bgm_right = _texture_node("BgmRight", COMPONENT_ROOT + "slider-right-arrow.png", Vector2(222, 20))
	visuals.effect_left = _texture_node("EffectLeft", COMPONENT_ROOT + "slider-left-arrow.png", Vector2(74, 45))
	visuals.effect_track = _texture_node("EffectTrack", COMPONENT_ROOT + "slider-track.png", Vector2(83, 49))
	visuals.effect_thumb = _texture_node("EffectThumb", COMPONENT_ROOT + "slider-thumb.png", Vector2.ZERO)
	visuals.effect_right = _texture_node("EffectRight", COMPONENT_ROOT + "slider-right-arrow.png", Vector2(222, 45))
	visuals.bgm_check = _texture_node("BgmCheck", COMPONENT_ROOT + "checkbox-off-opaque.png", Vector2(237, 22))
	visuals.bgm_on_label = _texture_node("BgmOnLabel", COMPONENT_ROOT + "on-label.png", Vector2(248, 22))
	visuals.effect_check = _texture_node("EffectCheck", COMPONENT_ROOT + "checkbox-on-opaque.png", Vector2(237, 41))
	visuals.effect_on_label = _texture_node("EffectOnLabel", COMPONENT_ROOT + "on-label.png", Vector2(248, 41))
	visuals.skin_dropdown = _texture_node("SkinDropdown", COMPONENT_ROOT + "skin-dropdown.png", Vector2(75, 65))

	visuals.footer_opaque_check = _texture_node("OpaqueCheck", COMPONENT_ROOT + "footer-checkbox-off-opaque.png", Vector2(11, 102))
	visuals.footer_opaque = _texture_node("OpaqueLabel", COMPONENT_ROOT + "footer-opaque.png", Vector2(21, 99))
	visuals.footer_snap = _texture_node("SnapLabel", COMPONENT_ROOT + "footer-snap.png", Vector2(76, 99))
	visuals.footer_attack_check = _texture_node("AttackCheck", COMPONENT_ROOT + "footer-checkbox-on-opaque.png", Vector2(112, 102))
	visuals.footer_attack = _texture_node("AttackLabel", COMPONENT_ROOT + "footer-attack.png", Vector2(122, 99))
	visuals.footer_skill_check = _texture_node("SkillCheck", COMPONENT_ROOT + "footer-checkbox-off-opaque.png", Vector2(163, 102))
	visuals.footer_skill = _texture_node("SkillLabel", COMPONENT_ROOT + "footer-skill.png", Vector2(173, 99))
	visuals.footer_item_check = _texture_node("ItemCheck", COMPONENT_ROOT + "footer-checkbox-on-opaque.png", Vector2(204, 102))
	visuals.footer_item = _texture_node("ItemLabel", COMPONENT_ROOT + "footer-item.png", Vector2(214, 99))

	for key in visuals.keys():
		if key not in ["plate", "option_tab", "info_tab"]:
			expanded_nodes.append(visuals[key])

	_build_info_panel()
	_build_skin_menu()

	minimized_plate = _texture_node("MinimizedPlate", COMPONENT_ROOT + "minimized-plate.png", Vector2.ZERO)
	minimized_plate.visible = false

	visuals.title_icon = _texture_node("TitleIcon", COMPONENT_ROOT + "title-icon.png", Vector2(3, 3))
	visuals.title_text = _texture_node("TitleText", COMPONENT_ROOT + "title-text.png", Vector2(16, 4))
	visuals.minimize = _texture_node("MinimizeVisual", COMPONENT_ROOT + "minimize.png", Vector2(251, 3))
	visuals.close = _texture_node("CloseVisual", COMPONENT_ROOT + "close.png", Vector2(266, 2))

func _build_info_panel() -> void:
	info_panel = Control.new()
	info_panel.name = "InfoPanel"
	info_panel.position = Vector2(19, 18)
	info_panel.size = Vector2(246, 79)
	info_panel.visible = false
	info_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(info_panel)
	expanded_nodes.append(info_panel)
	var fill := ColorRect.new()
	fill.color = Color("#fafafa")
	fill.size = info_panel.size
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info_panel.add_child(fill)
	var label := Label.new()
	label.text = "情報はありません"
	label.position = Vector2(53, 25)
	label.size = Vector2(145, 24)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_override("font", load("res://assets/fonts/DotGothic16-Regular.ttf"))
	label.add_theme_font_size_override("font_size", 11)
	label.add_theme_color_override("font_color", Color("#17395f"))
	info_panel.add_child(label)

func _build_skin_menu() -> void:
	skin_value = Label.new()
	skin_value.name = "SkinValue"
	skin_value.position = Vector2(80, 65)
	skin_value.size = Vector2(145, 18)
	skin_value.add_theme_font_override("font", load("res://assets/fonts/DotGothic16-Regular.ttf"))
	skin_value.add_theme_font_size_override("font_size", 11)
	skin_value.add_theme_color_override("font_color", Color("#183d70"))
	skin_value.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(skin_value)
	expanded_nodes.append(skin_value)

	skin_menu = Control.new()
	skin_menu.name = "SkinMenu"
	skin_menu.position = Vector2(75, 83)
	skin_menu.size = Vector2(184, 55)
	skin_menu.visible = false
	skin_menu.z_index = 30
	add_child(skin_menu)
	expanded_nodes.append(skin_menu)
	var panel := ColorRect.new()
	panel.color = Color("#f6f4f7")
	panel.size = skin_menu.size
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	skin_menu.add_child(panel)
	for index in 3:
		var option := Button.new()
		option.name = "SkinOption%d" % index
		option.text = ["ブルー", "グレー", "クラシック"][index]
		option.position = Vector2(1, 1 + index * 17)
		option.size = Vector2(182, 17)
		option.flat = true
		option.alignment = HORIZONTAL_ALIGNMENT_LEFT
		option.add_theme_font_override("font", load("res://assets/fonts/DotGothic16-Regular.ttf"))
		option.add_theme_font_size_override("font_size", 11)
		option.add_theme_color_override("font_color", Color("#183d70"))
		option.add_theme_color_override("font_hover_color", Color("#102b50"))
		option.pressed.connect(_choose_skin.bind(option.text))
		skin_menu.add_child(option)

func _build_hits() -> void:
	var title_hit := Control.new()
	title_hit.name = "TitleDragHit"
	title_hit.position = Vector2.ZERO
	title_hit.size = Vector2(251, 18)
	title_hit.mouse_filter = Control.MOUSE_FILTER_STOP
	title_hit.mouse_default_cursor_shape = Control.CURSOR_MOVE
	title_hit.gui_input.connect(_on_title_input)
	add_child(title_hit)
	hits.title = title_hit
	hit_visuals[title_hit.name] = visuals.plate

	hits.minimize = _transparent_button("MinimizeButton", Vector2(251, 0), Vector2(14, 18), _toggle_minimized)
	hits.close = _transparent_button("CloseButton", Vector2(266, 0), Vector2(13, 18), _close)
	hits.option_tab = _transparent_button("OptionTabButton", Vector2(5, 18), Vector2(14, 37), _set_tab.bind("option"))
	hits.info_tab = _transparent_button("InfoTabButton", Vector2(5, 55), Vector2(14, 40), _set_tab.bind("info"))
	_wire_press_visual(hits.minimize, visuals.minimize)
	_wire_press_visual(hits.close, visuals.close)
	_wire_press_visual(hits.option_tab, visuals.option_tab)
	_wire_press_visual(hits.info_tab, visuals.info_tab)

	for row in ["bgm", "effect"]:
		var y := 22.0 if row == "bgm" else 47.0
		hits[row + "_left"] = _transparent_button(row.capitalize() + "Left", Vector2(74, y - 2), Vector2(12, 15), _step_volume.bind(row, -1))
		hits[row + "_right"] = _transparent_button(row.capitalize() + "Right", Vector2(222, y - 2), Vector2(14, 15), _step_volume.bind(row, 1))
		var slider := Control.new()
		slider.name = row.capitalize() + "Slider"
		slider.position = Vector2(86, y)
		slider.size = Vector2(136, 15)
		slider.mouse_filter = Control.MOUSE_FILTER_STOP
		slider.focus_mode = Control.FOCUS_ALL
		slider.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		slider.gui_input.connect(_on_slider_input.bind(row, slider))
		add_child(slider)
		hits[row + "_slider"] = slider
		hit_visuals[slider.name] = visuals[row + "_thumb"]
		var check_y := 22.0 if row == "bgm" else 41.0
		hits[row + "_check"] = _transparent_button(row.capitalize() + "Toggle", Vector2(237, check_y), Vector2(34, 15), _toggle_volume.bind(row))
		_wire_press_visual(hits[row + "_left"], visuals[row + "_left"])
		_wire_press_visual(hits[row + "_right"], visuals[row + "_right"])
		_wire_press_visual(hits[row + "_check"], visuals[row + "_check"])

	hits.skin = _transparent_button("SkinButton", Vector2(75, 65), Vector2(184, 18), _toggle_skin_menu)
	_wire_press_visual(hits.skin, visuals.skin_dropdown)
	for item in [["opaque", 10, 60], ["attack", 112, 50], ["skill", 162, 43], ["item", 204, 40]]:
		hits[item[0]] = _transparent_button(item[0].capitalize() + "Toggle", Vector2(item[1], 99), Vector2(item[2], 20), _toggle_footer.bind(item[0]))
		_wire_press_visual(hits[item[0]], visuals["footer_" + item[0] + "_check"])

func _on_slider_input(event: InputEvent, row: String, slider: Control) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			dragging_slider = row
			visuals[row + "_thumb"].modulate = Color(0.78, 0.78, 0.78, 1.0)
			_set_volume_from_pointer(row, event.position.x, slider.size.x)
		else:
			dragging_slider = ""
			visuals[row + "_thumb"].modulate = Color.WHITE
	elif event is InputEventMouseMotion and dragging_slider == row and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_volume_from_pointer(row, event.position.x, slider.size.x)
	elif event is InputEventKey and event.pressed:
		if event.keycode in [KEY_LEFT, KEY_DOWN]: _step_volume(row, -1)
		elif event.keycode in [KEY_RIGHT, KEY_UP]: _step_volume(row, 1)
		elif event.keycode == KEY_HOME: _set_volume(row, 0)
		elif event.keycode == KEY_END: _set_volume(row, 100)

func _set_volume_from_pointer(row: String, pointer_x: float, width: float) -> void:
	var usable_interval := maxf(width - 1.0, 1.0)
	_set_volume(row, roundi(clampf(pointer_x / usable_interval, 0.0, 1.0) * 100.0))

func _step_volume(row: String, delta: int) -> void:
	_set_volume(row, clampi((bgm if row == "bgm" else effect) + delta, 0, 100))

func _set_volume(row: String, value: int) -> void:
	if row == "bgm": bgm = value
	else: effect = value
	_update_volume_visuals()
	_publish_qa()

func _toggle_volume(row: String) -> void:
	if row == "bgm": bgm_on = not bgm_on
	else: effect_on = not effect_on
	_update_checkbox_visuals()
	_publish_qa()

func _toggle_footer(key: String) -> void:
	footer[key] = not footer[key]
	_update_checkbox_visuals()
	_publish_qa()

func _set_tab(tab: String) -> void:
	active_tab = tab
	skin_open = false
	_update_tab_visuals()
	_publish_qa()

func _toggle_skin_menu() -> void:
	skin_open = not skin_open
	skin_menu.visible = skin_open
	if skin_open: skin_menu.move_to_front()
	clip_contents = not skin_open
	_publish_qa()

func _choose_skin(value: String) -> void:
	skin = value
	skin_value.text = skin
	skin_open = false
	skin_menu.visible = false
	clip_contents = true
	_publish_qa()

func _on_title_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging_window = event.pressed
		if event.pressed: drag_offset = get_global_mouse_position() - position
	elif event is InputEventMouseMotion and dragging_window and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		var desired := get_global_mouse_position() - drag_offset
		position = Vector2(
			clampf(round(desired.x), 0.0, VIEWPORT_SIZE.x - size.x),
			clampf(round(desired.y), 0.0, VIEWPORT_SIZE.y - size.y)
		)
		_publish_qa()

func _toggle_minimized() -> void:
	if get_tree().get_processed_tweens().size() > 0: return
	skin_open = false
	skin_menu.visible = false
	clip_contents = true
	animation_start_size = size
	animation_end_size = EXPANDED_SIZE if minimized else MINIMIZED_SIZE
	if minimized:
		for node in expanded_nodes: node.visible = true
		minimized_plate.visible = true
	var tween := create_tween()
	tween.tween_method(_set_minimize_progress, 0.0, 1.0, 0.208)
	tween.tween_callback(_finish_minimize)

func _set_minimize_progress(progress: float) -> void:
	var stepped: float = floor(progress * 13.0) / 13.0
	size = animation_start_size.lerp(animation_end_size, stepped).round()
	_update_title_controls()
	_publish_qa()

func _finish_minimize() -> void:
	size = animation_end_size
	minimized = size == MINIMIZED_SIZE
	if minimized:
		for node in expanded_nodes: node.visible = false
		minimized_plate.visible = true
	else:
		minimized_plate.visible = false
		_update_tab_visuals()
	_update_title_controls()
	_publish_qa()

func _update_title_controls() -> void:
	visuals.minimize.position.x = size.x - 29
	visuals.close.position.x = size.x - 14
	hits.minimize.position.x = size.x - 29
	hits.close.position.x = size.x - 14
	hits.title.size.x = size.x - 29

func _close() -> void:
	visible = false
	_publish_qa()

func _update_all_visuals() -> void:
	_update_volume_visuals()
	_update_checkbox_visuals()
	_update_tab_visuals()
	_update_title_controls()

func _update_volume_visuals() -> void:
	visuals.bgm_thumb.position = Vector2(75.5 + bgm * 1.42, 22)
	visuals.effect_thumb.position = Vector2(75.5 + effect * 1.42, 47)

func _update_checkbox_visuals() -> void:
	visuals.bgm_check.texture = load(COMPONENT_ROOT + ("checkbox-on-opaque.png" if bgm_on else "checkbox-off-opaque.png"))
	visuals.effect_check.texture = load(COMPONENT_ROOT + ("checkbox-on-opaque.png" if effect_on else "checkbox-off-opaque.png"))
	for key in footer.keys():
		visuals["footer_" + key + "_check"].texture = load(COMPONENT_ROOT + ("footer-checkbox-on-opaque.png" if footer[key] else "footer-checkbox-off-opaque.png"))

func _update_tab_visuals() -> void:
	var option_active := active_tab == "option"
	visuals.option_tab.texture = load(COMPONENT_ROOT + ("tab-option.png" if option_active else "tab-option-inactive.png"))
	visuals.info_tab.texture = load(COMPONENT_ROOT + ("tab-info.png" if option_active else "tab-info-selected.png"))
	info_panel.visible = not option_active
	for key in visuals.keys():
		if key in ["plate", "option_tab", "info_tab", "title_icon", "title_text", "minimize", "close"]: continue
		visuals[key].visible = option_active
	skin_value.visible = option_active
	for key in hits.keys():
		if key in ["title", "minimize", "close", "option_tab", "info_tab"]: continue
		hits[key].visible = option_active

func _qa_state() -> Dictionary:
	return {
		"ready": true,
		"bgm": bgm,
		"effect": effect,
		"bgm_on": bgm_on,
		"effect_on": effect_on,
		"footer": footer,
		"tab": active_tab,
		"skin": skin,
		"skin_open": skin_open,
		"minimized": minimized,
		"visible": visible,
		"position": [roundi(position.x), roundi(position.y)],
		"window_size": [roundi(size.x), roundi(size.y)],
		"visual_authorities": visuals.size() + 1,
		"controls": hits.size(),
		"mapped_controls": hit_visuals.size(),
	}

func _publish_qa() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.godotQaState = " + JSON.stringify(_qa_state()) + ";")
