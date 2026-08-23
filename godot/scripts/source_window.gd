extends Control

signal activated(window_id: String)
signal state_changed
signal navigation_requested(window_id: String)

const VIEWPORT_SIZE := Vector2(849, 564)
const ASSET_PREFIX := "res://assets/windows"
const MINIMIZED_SIZE := Vector2(180, 18)

var definition: Dictionary = {}
var window_id := ""
var expanded_size := Vector2.ZERO
var expanded_position := Vector2.ZERO
var clean_plate: TextureRect
var minimized_plate: TextureRect
var component_nodes := {}
var component_geometry := {}
var hit_nodes := {}
var hit_visuals := {}
var control_states := {}
var range_values := {}
var minimized := false
var dragging_window := false
var dragging_range := ""
var drag_offset := Vector2.ZERO
var minimize_samples: Array[String] = []
var animation_start_size := Vector2.ZERO
var animation_end_size := Vector2.ZERO
var last_action := ""

func configure(value: Dictionary) -> void:
	definition = value
	window_id = str(value.id)
	var geometry: Dictionary = value.geometry
	expanded_position = Vector2(float(geometry.x), float(geometry.y))
	expanded_size = Vector2(float(geometry.width), float(geometry.height))
	position = expanded_position
	size = expanded_size
	name = window_id

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	# Only Party owns three documented satellite buttons outside its 160px body.
	# Every other window clips components and controls to prevent scrolled rows
	# from covering neighboring headers and hit surfaces.
	clip_contents = window_id != "party"
	_build_visuals()
	_build_hits()
	_build_drag_surface()

func _asset_path(browser_path: String) -> String:
	return ASSET_PREFIX + browser_path.trim_prefix("/assets")

func _texture_node(node_name: String, path: String, at: Vector2, dimensions: Vector2) -> TextureRect:
	var node := TextureRect.new()
	node.name = node_name
	node.texture = load(path)
	node.position = at
	node.size = dimensions
	node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	node.stretch_mode = TextureRect.STRETCH_SCALE
	node.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(node)
	return node

func _build_visuals() -> void:
	clean_plate = _texture_node(
		"clean-plate",
		_asset_path(str(definition.cleanPlate)),
		Vector2.ZERO,
		expanded_size
	)
	for component in definition.components:
		var geometry: Dictionary = component.geometry
		var component_id := str(component.id)
		var dimensions := Vector2(float(geometry.width), float(geometry.height))
		var at := Vector2(float(geometry.x), float(geometry.y))
		component_geometry[component_id] = {"position": at, "size": dimensions}
		component_nodes[component_id] = _texture_node(
			component_id,
			_asset_path(str(component.assetPath)),
			at,
			dimensions
		)
	if _has_minimize_control():
		var endpoint := _minimize_endpoint()
		minimized_plate = _texture_node("minimized-plate", _asset_path(endpoint), Vector2.ZERO, MINIMIZED_SIZE)
		minimized_plate.visible = false

func _build_hits() -> void:
	for index in definition.controls.size():
		var control: Dictionary = definition.controls[index]
		var geometry: Dictionary = control.geometry
		var node := Control.new()
		node.name = "hit-%03d" % index
		node.position = Vector2(float(geometry.x), float(geometry.y))
		node.size = Vector2(float(geometry.width), float(geometry.height))
		node.mouse_filter = Control.MOUSE_FILTER_STOP
		node.focus_mode = Control.FOCUS_ALL
		node.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		node.set_meta("control", control)
		node.gui_input.connect(_on_control_input.bind(node))
		add_child(node)
		hit_nodes[str(control.id)] = node
		var visual := _resolve_visual(control)
		if visual != null:
			hit_visuals[str(control.id)] = visual
		if str(control.role) == "input" and control.has("visualComponent"):
			range_values[str(control.id)] = _initial_range_value(str(control.id))

func _build_drag_surface() -> void:
	var drag_surface := Control.new()
	drag_surface.name = "drag-surface"
	drag_surface.position = _drag_surface_position()
	drag_surface.size = _drag_surface_size()
	drag_surface.mouse_filter = Control.MOUSE_FILTER_PASS
	drag_surface.mouse_default_cursor_shape = Control.CURSOR_MOVE
	drag_surface.gui_input.connect(_on_drag_input)
	add_child(drag_surface)
	drag_surface.move_to_front()
	for node in hit_nodes.values():
		node.move_to_front()

func _drag_surface_size() -> Vector2:
	if window_id == "bottom-bar": return Vector2(96, 21)
	if window_id == "notification": return Vector2(28, 10)
	if window_id == "quickbar": return Vector2(32, 49)
	return Vector2(maxf(expanded_size.x - 29.0, 1.0), minf(18.0, expanded_size.y))

func _drag_surface_position() -> Vector2:
	if window_id == "quickbar": return Vector2(80, 45)
	return Vector2.ZERO

func _resolve_visual(control: Dictionary) -> CanvasItem:
	if control.has("visualComponent") and component_nodes.has(str(control.visualComponent)):
		return component_nodes[str(control.visualComponent)]
	var hit: Rect2 = _rect_from_geometry(control.geometry)
	var best: CanvasItem
	var best_area := 0.0
	for component_id in component_geometry.keys():
		var geometry: Dictionary = component_geometry[component_id]
		var component_rect := Rect2(geometry.position, geometry.size)
		var overlap := hit.intersection(component_rect).get_area()
		if overlap > best_area:
			best_area = overlap
			best = component_nodes[component_id]
	if best == null:
		var feedback := ColorRect.new()
		feedback.name = "feedback-%s" % str(control.id).validate_node_name()
		feedback.position = hit.position
		feedback.size = hit.size
		feedback.color = Color(0.45, 0.65, 0.92, 0.0)
		feedback.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(feedback)
		best = feedback
	return best

func _rect_from_geometry(geometry: Dictionary) -> Rect2:
	return Rect2(
		Vector2(float(geometry.x), float(geometry.y)),
		Vector2(float(geometry.width), float(geometry.height))
	)

func _on_drag_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging_window = event.pressed
		if event.pressed:
			activated.emit(window_id)
			drag_offset = get_global_mouse_position() - position
	elif event is InputEventMouseMotion and dragging_window and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		var desired := get_global_mouse_position() - drag_offset
		position = Vector2(
			clampf(round(desired.x), 0.0, VIEWPORT_SIZE.x - size.x),
			clampf(round(desired.y), 0.0, VIEWPORT_SIZE.y - size.y)
		)
		state_changed.emit()

func _on_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			_set_press_visual(control_id, true)
			if _is_range(control):
				dragging_range = control_id
				_set_range_from_pointer(control, event.position, node.size)
		else:
			_set_press_visual(control_id, false)
			if dragging_range == control_id:
				dragging_range = ""
			else:
				_activate_control(control)
	elif event is InputEventMouseMotion and dragging_range == control_id and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_range_from_pointer(control, event.position, node.size)
	elif event is InputEventKey and event.pressed:
		if _is_range(control):
			var delta := -1 if event.keycode in [KEY_LEFT, KEY_DOWN] else 1
			if event.keycode in [KEY_LEFT, KEY_DOWN, KEY_RIGHT, KEY_UP]:
				_set_range(control, clampi(int(range_values.get(control_id, 50)) + delta, 0, 100))
			elif event.keycode == KEY_HOME:
				_set_range(control, 0)
			elif event.keycode == KEY_END:
				_set_range(control, 100)
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_activate_control(control)

func _is_range(control: Dictionary) -> bool:
	if str(control.role) != "input" or not control.has("visualComponent"): return false
	var id := str(control.id)
	return id in ["HP", "SP", "カード情報スクロール", "スキルスクロール", "所持品スクロール", "クイックスロット位置"]

func _initial_range_value(control_id: String) -> int:
	match control_id:
		"HP": return 62
		"SP": return 43
		"カード情報スクロール", "スキルスクロール", "所持品スクロール": return 0
		_: return 50

func _set_range_from_pointer(control: Dictionary, pointer: Vector2, dimensions: Vector2) -> void:
	var vertical := dimensions.y > dimensions.x
	var extent := dimensions.y if vertical else dimensions.x
	var axis := pointer.y if vertical else pointer.x
	_set_range(control, roundi(clampf(axis / maxf(extent - 1.0, 1.0), 0.0, 1.0) * 100.0))

func _set_range(control: Dictionary, value: int) -> void:
	var control_id := str(control.id)
	range_values[control_id] = value
	var visual_id := str(control.visualComponent)
	if component_nodes.has(visual_id):
		var visual: CanvasItem = component_nodes[visual_id]
		var original: Dictionary = component_geometry[visual_id]
		var control_rect := _rect_from_geometry(control.geometry)
		var vertical := control_rect.size.y > control_rect.size.x
		if vertical:
			visual.position.y = control_rect.position.y + (control_rect.size.y - original.size.y) * value / 100.0
		else:
			visual.position.x = control_rect.position.x + (control_rect.size.x - original.size.x) * value / 100.0
	last_action = "%s:%d" % [control_id, value]
	state_changed.emit()

func _activate_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	if control.has("minimizeEndpoint"):
		_toggle_minimized()
		return
	if control.has("closeWindow"):
		visible = false
		state_changed.emit()
		return
	var destination := _navigation_destination(control_id)
	if destination != "":
		navigation_requested.emit(destination)
	control_states[control_id] = not bool(control_states.get(control_id, false))
	var visual: CanvasItem = hit_visuals.get(control_id)
	if visual != null:
		if visual is ColorRect:
			visual.color.a = 0.18 if control_states[control_id] else 0.0
		else:
			visual.modulate = Color(0.82, 0.9, 1.0, 1.0) if control_states[control_id] else Color.WHITE
	state_changed.emit()

func _navigation_destination(control_id: String) -> String:
	match control_id:
		"status": return "status"
		"option": return "options"
		"items": return "inventory"
		"equip": return "equipment"
		"skill": return "skills"
		"chat": return "chat"
		"friend": return "party"
		_: return ""

func _set_press_visual(control_id: String, pressed: bool) -> void:
	var visual: CanvasItem = hit_visuals.get(control_id)
	if visual != null:
		if visual is ColorRect:
			visual.color.a = 0.32 if pressed else 0.0
		else:
			visual.modulate = Color(0.7, 0.7, 0.7, 1.0) if pressed else Color.WHITE

func _has_minimize_control() -> bool:
	for control in definition.controls:
		if control.has("minimizeEndpoint"): return true
	return false

func _minimize_endpoint() -> String:
	for control in definition.controls:
		if control.has("minimizeEndpoint"): return str(control.minimizeEndpoint)
	return ""

func _toggle_minimized() -> void:
	if get_tree().get_processed_tweens().size() > 0: return
	animation_start_size = size
	animation_end_size = expanded_size if minimized else MINIMIZED_SIZE
	minimize_samples = ["%dx%d" % [roundi(size.x), roundi(size.y)]]
	if minimized:
		_set_expanded_visuals_visible(true)
		minimized_plate.visible = true
	var tween := create_tween()
	tween.tween_method(_set_minimize_progress, 0.0, 1.0, 0.208)
	tween.tween_callback(_finish_minimize)

func _set_minimize_progress(progress: float) -> void:
	var stepped: float = floor(progress * 13.0) / 13.0
	size = animation_start_size.lerp(animation_end_size, stepped).round()
	var geometry := "%dx%d" % [roundi(size.x), roundi(size.y)]
	if minimize_samples.is_empty() or minimize_samples[-1] != geometry:
		minimize_samples.append(geometry)
	state_changed.emit()

func _finish_minimize() -> void:
	size = animation_end_size
	minimized = size == MINIMIZED_SIZE
	if minimized:
		_set_expanded_visuals_visible(false)
		minimized_plate.visible = true
	else:
		minimized_plate.visible = false
	state_changed.emit()

func _set_expanded_visuals_visible(value: bool) -> void:
	clean_plate.visible = value
	for visual in component_nodes.values(): visual.visible = value
	for hit in hit_nodes.values(): hit.visible = value
	get_node("drag-surface").visible = value
	if not value:
		var restore := Control.new()
		restore.name = "restore-surface"
		restore.position = Vector2.ZERO
		restore.size = MINIMIZED_SIZE
		restore.mouse_filter = Control.MOUSE_FILTER_STOP
		restore.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		restore.gui_input.connect(func(event: InputEvent) -> void:
			if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
				_toggle_minimized()
		)
		add_child(restore)
	else:
		var restore := get_node_or_null("restore-surface")
		if restore != null: restore.queue_free()

func visual_authority_count() -> int:
	return component_nodes.size() + 1

func control_count() -> int:
	return hit_nodes.size()

func qa_state() -> Dictionary:
	return {
		"id": window_id,
		"visible": visible,
		"minimized": minimized,
		"position": [roundi(position.x), roundi(position.y)],
		"size": [roundi(size.x), roundi(size.y)],
		"components": visual_authority_count(),
		"controls": control_count(),
		"mapped_controls": hit_visuals.size(),
		"range_values": range_values,
		"last_action": last_action,
		"minimize_samples": minimize_samples,
	}
