extends "res://scripts/source_window.gd"

const SKILL_NAMES := [
	"ディバインプロテクション", "ワープポータル", "ニューマ", "ヒール",
	"エンジェラス", "ブレッシング", "速度増加", "ルアフ",
]
const LIST_ORIGIN := Vector2(0, 18)
const LIST_SIZE := Vector2(263, 144)

var scroll_value := 34
var selected_index := 0
var leveled_indices: Array[int] = []
var feedback := ""
var list_clip: Control
var list_visual_idle := {}
var list_hit_idle := {}

func _ready() -> void:
	super._ready()
	_build_list_clip()
	_rewire_skills_hits()
	_update_scroll(34)
	_update_skill_visuals()

func _build_list_clip() -> void:
	list_clip = Control.new()
	list_clip.name = "SkillsListClip"
	list_clip.position = LIST_ORIGIN
	list_clip.size = LIST_SIZE
	list_clip.clip_contents = true
	list_clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(list_clip)
	for index in 8:
		for component_id in ["skill-icon-%d" % index, "skill-copy-%d" % index, "skill-level-%d" % index]:
			var visual: TextureRect = component_nodes[component_id]
			var idle := visual.position - LIST_ORIGIN
			remove_child(visual)
			list_clip.add_child(visual)
			visual.position = idle
			list_visual_idle[component_id] = idle
	for control_id in hit_nodes.keys():
		var hit: Control = hit_nodes[control_id]
		var control: Dictionary = hit.get_meta("control")
		var visual_id := str(control.get("visualComponent", ""))
		if not (visual_id.begins_with("skill-icon-") or visual_id.begins_with("skill-level-")): continue
		var idle := hit.position - LIST_ORIGIN
		remove_child(hit)
		list_clip.add_child(hit)
		hit.position = idle
		list_hit_idle[control_id] = idle
	list_clip.move_to_front()
	for id in ["skills-scrollbar-track", "skills-scrollbar-thumb", "skills-points", "skills-use", "skills-close-action", "skills-resize", "skills-title-icon", "skills-title-text", "skills-close"]:
		component_nodes[id].move_to_front()
	for node: Control in hit_nodes.values(): node.move_to_front()

func _rewire_skills_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_skills_control_input.bind(node))

func _on_skills_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			_set_press_visual(control_id, true)
			if control_id == "スキルスクロール":
				dragging_range = control_id
				_set_scroll_from_pointer(event.position.y, node.size.y)
		else:
			_set_press_visual(control_id, false)
			if control_id == "スキルスクロール":
				dragging_range = ""
			else:
				_activate_skills_control(control)
	elif event is InputEventMouseMotion and dragging_range == control_id and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_scroll_from_pointer(event.position.y, node.size.y)
	elif event is InputEventKey and event.pressed:
		if control_id == "スキルスクロール":
			if event.keycode in [KEY_LEFT, KEY_DOWN]: _update_scroll(clampi(scroll_value - 1, 0, 100))
			elif event.keycode in [KEY_RIGHT, KEY_UP]: _update_scroll(clampi(scroll_value + 1, 0, 100))
			elif event.keycode == KEY_HOME: _update_scroll(0)
			elif event.keycode == KEY_END: _update_scroll(100)
		else:
			var row_index := _row_index(control)
			if row_index >= 0 and event.keycode in [KEY_UP, KEY_DOWN]:
				_select_skill(posmod(selected_index + (-1 if event.keycode == KEY_UP else 1), 8))
			elif event.keycode in [KEY_ENTER, KEY_SPACE]:
				_activate_skills_control(control)

func _activate_skills_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	if control.has("closeWindow"):
		super._activate_control(control)
		return
	if control_id == "use":
		feedback = "use %s" % SKILL_NAMES[selected_index]
		component_nodes["skills-use"].modulate = Color(0.78, 0.9, 1.0, 1.0)
		state_changed.emit()
		return
	var row_index := _row_index(control)
	if row_index < 0: return
	var visual_id := str(control.visualComponent)
	if visual_id.begins_with("skill-level-"):
		if row_index in leveled_indices: leveled_indices.erase(row_index)
		else: leveled_indices.append(row_index)
		leveled_indices.sort()
		feedback = "%s Lv+1" % SKILL_NAMES[row_index] if row_index in leveled_indices else ""
	else:
		_select_skill(row_index)
	_update_skill_visuals()
	state_changed.emit()

func _row_index(control: Dictionary) -> int:
	var visual_id := str(control.get("visualComponent", ""))
	if not (visual_id.begins_with("skill-icon-") or visual_id.begins_with("skill-level-")): return -1
	return int(visual_id.get_slice("-", 2))

func _select_skill(index: int) -> void:
	selected_index = clampi(index, 0, 7)
	feedback = ""
	if selected_index < 4 and scroll_value > 34: _update_scroll(34)
	elif selected_index >= 4 and scroll_value < 100: _update_scroll(100)
	_update_skill_visuals()

func _set_scroll_from_pointer(pointer_y: float, extent: float) -> void:
	_update_scroll(roundi(clampf(pointer_y / maxf(extent - 1.0, 1.0), 0.0, 1.0) * 100.0))

func _update_scroll(value: int) -> void:
	scroll_value = clampi(value, 0, 100)
	range_values["スキルスクロール"] = scroll_value
	var thumb: TextureRect = component_nodes["skills-scrollbar-thumb"]
	thumb.position.y = 28 + roundi(79.0 * scroll_value / 100.0)
	var list_offset := 0 if scroll_value <= 34 else roundi(144.0 * (scroll_value - 34) / 66.0)
	for component_id in list_visual_idle.keys():
		var visual: TextureRect = component_nodes[component_id]
		visual.position = list_visual_idle[component_id] - Vector2(0, list_offset)
	for control_id in list_hit_idle.keys():
		var hit: Control = hit_nodes[control_id]
		hit.position = list_hit_idle[control_id] - Vector2(0, list_offset)
		var fully_visible := hit.position.y >= 0 and hit.position.y + hit.size.y <= LIST_SIZE.y
		hit.mouse_filter = Control.MOUSE_FILTER_STOP if fully_visible else Control.MOUSE_FILTER_IGNORE
	last_action = "スキルスクロール:%d" % scroll_value
	state_changed.emit()

func _update_skill_visuals() -> void:
	for index in 8:
		var selected_feedback := index == selected_index and selected_index != 0
		component_nodes["skill-copy-%d" % index].modulate = Color(0.78, 0.95, 1.0, 1.0) if selected_feedback else Color.WHITE
		component_nodes["skill-level-%d" % index].modulate = Color(0.74, 0.88, 1.0, 1.0) if index in leveled_indices else Color.WHITE

func qa_state() -> Dictionary:
	var state := super.qa_state()
	state.skills_state = {
		"scroll": scroll_value,
		"selected_index": selected_index,
		"leveled_indices": leveled_indices,
		"feedback": feedback,
	}
	return state
