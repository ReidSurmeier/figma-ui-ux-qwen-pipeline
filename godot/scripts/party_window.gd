extends "res://scripts/source_window.gd"

const SATELLITE_IDS := ["party-action-0", "party-action-1", "party-action-2"]
var selected_member := -1
var selected_tool := -1
var view := "party"
var page := 1
var feedback := ""
var satellite_globals := {}

func _ready() -> void:
	super._ready()
	for id in SATELLITE_IDS:
		satellite_globals[id] = expanded_position + component_geometry[id].position
	_rewire_party_hits()
	_anchor_satellites()
	_update_party_visuals()

func _rewire_party_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections(): node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_party_control_input.bind(node))

func _on_party_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_press_visual(str(control.id), event.pressed)
		if not event.pressed:
			activated.emit(window_id)
			_activate_party_control(control)
	elif event is InputEventKey and event.pressed and event.keycode in [KEY_ENTER, KEY_SPACE]:
		_activate_party_control(control)

func _activate_party_control(control: Dictionary) -> void:
	if control.has("closeWindow"):
		super._activate_control(control); return
	var id := str(control.id)
	var visual := str(control.get("visualComponent", ""))
	if visual.begins_with("party-member-"):
		var index := int(visual.get_slice("-", 2)); selected_member = -1 if selected_member == index else index
	elif visual.begins_with("party-tool-"):
		var index := int(visual.get_slice("-", 2)); selected_tool = -1 if selected_tool == index else index
	elif id == "友達": view = "friends"
	elif id == "パーティー": view = "party"
	elif id == "next": page = 2; feedback = "next 2/2"
	elif id == "back": page = 1; feedback = "back 1/2"
	elif id == "sell": feedback = "sell"
	last_action = id
	_update_party_visuals()
	state_changed.emit()

func _on_drag_input(event: InputEvent) -> void:
	super._on_drag_input(event)
	if event is InputEventMouseMotion and dragging_window:
		_anchor_satellites()
		state_changed.emit()

func _anchor_satellites() -> void:
	for id in SATELLITE_IDS:
		component_nodes[id].position = satellite_globals[id] - position
	for node: Control in hit_nodes.values():
		var visual := str(node.get_meta("control").get("visualComponent", ""))
		if visual in SATELLITE_IDS: node.position = satellite_globals[visual] - position

func _update_party_visuals() -> void:
	for index in 5:
		component_nodes["party-member-%d" % index].modulate = Color(0.72, 0.88, 1.0, 1.0) if selected_member == index else Color.WHITE
		component_nodes["party-tool-%d" % index].modulate = Color(0.72, 0.88, 1.0, 1.0) if selected_tool == index else Color.WHITE
	component_nodes["party-friends"].modulate = Color(0.72, 0.88, 1.0, 1.0) if view == "friends" else Color.WHITE
	component_nodes["party-party-tab"].modulate = Color.WHITE if view == "party" else Color(0.76, 0.76, 0.76, 1.0)

func qa_state() -> Dictionary:
	var result := super.qa_state()
	var positions: Array = []
	for id in SATELLITE_IDS:
		var point: Vector2 = satellite_globals[id]
		positions.append([roundi(point.x), roundi(point.y)])
	result.party_state = {"selected_member": selected_member, "selected_tool": selected_tool, "view": view, "page": page, "feedback": feedback, "satellite_global_positions": positions}
	return result
