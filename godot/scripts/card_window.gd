extends "res://scripts/source_window.gd"

const HEADER_LEFT_PLATE := "res://assets/windows/japanese-rpg-v001/card/components/header-left-plate.png"
const ART_PANEL_EMPTY := "res://assets/windows/japanese-rpg-v001/card/components/art-panel-empty.png"
const ART_ISOLATED := "res://assets/windows/japanese-rpg-v001/card/components/art-isolated-source-locked.png"
const COPY_CLIP_RECT := Rect2(90, 20, 155, 92)

var rotated := false
var art_animating := false
var scroll_value := 0
var slot_active := false
var copy_clip: Control
var copy_idle_positions := {}

func _ready() -> void:
	super._ready()
	_replace_invalid_header_fragment()
	_split_art_from_panel()
	_build_copy_clip()
	_rewire_card_hits()
	_update_card_scroll(0)

func _replace_invalid_header_fragment() -> void:
	var invalid_fragment: CanvasItem = component_nodes.get("card-title-icon")
	if invalid_fragment != null:
		invalid_fragment.queue_free()
		component_nodes.erase("card-title-icon")
		component_geometry.erase("card-title-icon")
	var patch := _texture_node("card-header-left-plate", HEADER_LEFT_PLATE, Vector2.ZERO, Vector2(86, 18))
	component_nodes["card-header-left-plate"] = patch
	component_geometry["card-header-left-plate"] = {"position": Vector2.ZERO, "size": Vector2(86, 18)}
	patch.move_to_front()
	for id in ["card-title-text", "card-close"]:
		component_nodes[id].move_to_front()

func _split_art_from_panel() -> void:
	var panel: TextureRect = component_nodes["card-art"]
	panel.name = "card-art-panel"
	panel.texture = load(ART_PANEL_EMPTY)
	component_nodes["card-art-panel"] = panel
	component_geometry["card-art-panel"] = component_geometry["card-art"]
	var art := _texture_node("card-art", ART_ISOLATED, Vector2(5, 18), Vector2(82, 96))
	component_nodes["card-art"] = art
	component_geometry["card-art"] = {"position": Vector2(5, 18), "size": Vector2(82, 96)}
	hit_visuals["カードを回転"] = art
	panel.move_to_front()
	art.move_to_front()

func _build_copy_clip() -> void:
	copy_clip = Control.new()
	copy_clip.name = "CopyClip"
	copy_clip.position = COPY_CLIP_RECT.position
	copy_clip.size = COPY_CLIP_RECT.size
	copy_clip.clip_contents = true
	copy_clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(copy_clip)
	for index in 5:
		var component_id := "card-copy-%d" % index
		var node: TextureRect = component_nodes[component_id]
		var global_idle := node.position
		remove_child(node)
		copy_clip.add_child(node)
		node.position = global_idle - COPY_CLIP_RECT.position
		copy_idle_positions[component_id] = node.position
	copy_clip.move_to_front()
	for id in ["card-scrollbar-track", "card-scrollbar-thumb", "card-bottom-icon", "card-bottom-slot", "card-close"]:
		component_nodes[id].move_to_front()

func _rewire_card_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_card_control_input.bind(node))
		node.move_to_front()

func _on_card_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			_set_press_visual(control_id, true)
			if control_id == "カード情報スクロール":
				dragging_range = control_id
				_set_card_scroll_from_pointer(event.position.y, node.size.y)
		else:
			_set_press_visual(control_id, false)
			if control_id == "カード情報スクロール":
				dragging_range = ""
			else:
				_activate_card_control(control)
	elif event is InputEventMouseMotion and dragging_range == control_id and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_card_scroll_from_pointer(event.position.y, node.size.y)
	elif event is InputEventKey and event.pressed:
		if control_id == "カード情報スクロール":
			if event.keycode in [KEY_LEFT, KEY_DOWN]: _update_card_scroll(clampi(scroll_value - 1, 0, 100))
			elif event.keycode in [KEY_RIGHT, KEY_UP]: _update_card_scroll(clampi(scroll_value + 1, 0, 100))
			elif event.keycode == KEY_HOME: _update_card_scroll(0)
			elif event.keycode == KEY_END: _update_card_scroll(100)
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_activate_card_control(control)

func _activate_card_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	match control_id:
		"カードを回転": _toggle_art_rotation()
		"カードスロット":
			slot_active = not slot_active
			_update_card_scroll(70 if slot_active else 30)
			component_nodes["card-bottom-slot"].modulate = Color(0.82, 0.9, 1.0, 1.0) if slot_active else Color.WHITE
		_:
			super._activate_control(control)
	state_changed.emit()

func _toggle_art_rotation() -> void:
	if art_animating: return
	art_animating = true
	var art: TextureRect = component_nodes["card-art"]
	art.pivot_offset = art.size / 2.0
	var target := 0.0 if rotated else deg_to_rad(2.0)
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(art, "rotation", target, 0.16)
	tween.tween_callback(func() -> void:
		rotated = not rotated
		art_animating = false
		state_changed.emit()
	)

func _set_card_scroll_from_pointer(pointer_y: float, extent: float) -> void:
	_update_card_scroll(roundi(clampf(pointer_y / maxf(extent - 1.0, 1.0), 0.0, 1.0) * 100.0))

func _update_card_scroll(value: int) -> void:
	scroll_value = clampi(value, 0, 100)
	range_values["カード情報スクロール"] = scroll_value
	var thumb: TextureRect = component_nodes["card-scrollbar-thumb"]
	thumb.position.y = 44 + roundi(27.0 * scroll_value / 100.0)
	var copy_offset := roundi(20.0 * scroll_value / 100.0)
	for component_id in copy_idle_positions.keys():
		var node: TextureRect = component_nodes[component_id]
		node.position = copy_idle_positions[component_id] - Vector2(0, copy_offset)
	last_action = "カード情報スクロール:%d" % scroll_value
	state_changed.emit()

func qa_state() -> Dictionary:
	var state := super.qa_state()
	state.card_state = {
		"rotated": rotated,
		"scroll": scroll_value,
		"slot_active": slot_active,
	}
	return state
