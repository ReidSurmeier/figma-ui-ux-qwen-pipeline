extends "res://scripts/source_window.gd"

var selected := ""

func _ready() -> void:
	super._ready()
	_rewire_equipment_hits()
	_update_equipment_visuals()

func _rewire_equipment_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_equipment_control_input.bind(node))

func _on_equipment_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_press_visual(control_id, event.pressed)
		if not event.pressed:
			activated.emit(window_id)
			_activate_equipment_control(control)
	elif event is InputEventKey and event.pressed:
		var key := _row_key(control)
		if key != "" and event.keycode in [KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT]:
			var side := key.get_slice("-", 0)
			var row := int(key.get_slice("-", 1))
			if event.keycode == KEY_UP: row = posmod(row - 1, 5)
			elif event.keycode == KEY_DOWN: row = posmod(row + 1, 5)
			elif event.keycode in [KEY_LEFT, KEY_RIGHT]: side = "right" if side == "left" else "left"
			_select_row("%s-%d" % [side, row])
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_activate_equipment_control(control)

func _activate_equipment_control(control: Dictionary) -> void:
	last_action = str(control.id)
	if control.has("minimizeEndpoint") or control.has("closeWindow"):
		super._activate_control(control)
		return
	var key := _row_key(control)
	if key != "": _select_row(key)

func _row_key(control: Dictionary) -> String:
	var visual_id := str(control.get("visualComponent", ""))
	if visual_id.begins_with("equipment-left-"): return "left-%s" % visual_id.get_slice("-", 2)
	if visual_id.begins_with("equipment-right-"): return "right-%s" % visual_id.get_slice("-", 2)
	return ""

func _select_row(key: String) -> void:
	selected = key
	last_action = "装備:%s" % key
	_update_equipment_visuals()
	state_changed.emit()

func _update_equipment_visuals() -> void:
	for side in ["left", "right"]:
		for row in 5:
			var key := "%s-%d" % [side, row]
			var visual: TextureRect = component_nodes["equipment-%s-%d" % [side, row]]
			visual.modulate = Color(0.74, 0.88, 1.0, 1.0) if selected == key else Color.WHITE

func qa_state() -> Dictionary:
	var result := super.qa_state()
	var selected_indices: Array[String] = []
	if selected != "": selected_indices.append(selected)
	result.equipment_state = {
		"selected": selected,
		"selected_indices": selected_indices,
	}
	return result
