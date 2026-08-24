extends "res://scripts/source_window.gd"

const PAGE_DESTINATIONS := {
	"status": "status",
	"option": "options",
	"items": "inventory",
	"equip": "equipment",
	"skill": "skills",
	"map": "map",
	"chat": "chat",
	"friend": "party",
}

var active_page := ""

func _ready() -> void:
	super._ready()
	_rewire_basic_info_hits()
	_set_basic_range("HP", 0)
	_set_basic_range("SP", 0)
	_update_page_visuals()

func _rewire_basic_info_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_basic_info_control_input.bind(node))

func _on_basic_info_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			if control_id in ["HP", "SP"]:
				dragging_range = control_id
				_set_basic_range_from_pointer(control_id, event.position.x, node.size.x)
			else:
				_set_press_visual(control_id, true)
		else:
			if control_id in ["HP", "SP"]:
				dragging_range = ""
			else:
				_set_press_visual(control_id, false)
				_activate_basic_info_control(control)
	elif event is InputEventMouseMotion and dragging_range == control_id and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_basic_range_from_pointer(control_id, event.position.x, node.size.x)
	elif event is InputEventKey and event.pressed:
		if control_id in ["HP", "SP"]:
			if event.keycode in [KEY_LEFT, KEY_DOWN]: _set_basic_range(control_id, clampi(int(range_values[control_id]) - 1, 0, 100))
			elif event.keycode in [KEY_RIGHT, KEY_UP]: _set_basic_range(control_id, clampi(int(range_values[control_id]) + 1, 0, 100))
			elif event.keycode == KEY_HOME: _set_basic_range(control_id, 0)
			elif event.keycode == KEY_END: _set_basic_range(control_id, 100)
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_activate_basic_info_control(control)

func _activate_basic_info_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	if control.has("minimizeEndpoint"):
		super._activate_control(control)
		return
	if not PAGE_DESTINATIONS.has(control_id): return
	active_page = control_id
	_update_page_visuals()
	navigation_requested.emit(str(PAGE_DESTINATIONS[control_id]))
	state_changed.emit()

func _set_basic_range_from_pointer(control_id: String, pointer_x: float, extent: float) -> void:
	_set_basic_range(control_id, roundi(clampf(pointer_x / maxf(extent - 1.0, 1.0), 0.0, 1.0) * 100.0))

func _set_basic_range(control_id: String, value: int) -> void:
	var control: Dictionary
	for candidate in definition.controls:
		if str(candidate.id) == control_id:
			control = candidate
			break
	if control.is_empty(): return
	super._set_range(control, value)

func _update_page_visuals() -> void:
	for page_id in PAGE_DESTINATIONS.keys():
		var visual_id := "page-%s" % page_id
		var visual: TextureRect = component_nodes[visual_id]
		visual.modulate = Color(0.72, 0.88, 1.0, 1.0) if page_id == active_page else Color.WHITE

func qa_state() -> Dictionary:
	var result := super.qa_state()
	result.basic_info_state = {
		"ranges": {"HP": int(range_values["HP"]), "SP": int(range_values["SP"])},
		"active_page": active_page,
		"destination": str(PAGE_DESTINATIONS.get(active_page, "")),
		"destination_view": "friends" if active_page == "friend" else "",
	}
	return result
