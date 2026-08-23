extends SceneTree

const EXPECTED_WINDOWS := [
	"basic-info", "card", "skills", "status", "inventory", "equipment",
	"chat", "exchange", "game-menu", "party", "quickbar", "compact-info",
	"bottom-bar", "notification", "options",
]

var failures: Array[String] = []
var assertion_count := 0

func _initialize() -> void:
	call_deferred("_run_contract")

func _check(condition: bool, message: String) -> void:
	assertion_count += 1
	if not condition:
		failures.append(message)
		push_error(message)

func _run_contract() -> void:
	var scene: Node = load("res://main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame

	var background: ColorRect = scene.get_node("DesktopBackground")
	_check(background.color == Color("#ff00fe"), "Desktop must restore the source pink background")

	var windows: Array = scene.get("desktop_windows")
	_check(windows.size() == EXPECTED_WINDOWS.size(), "Desktop must expose all 15 source windows")
	for window_id in EXPECTED_WINDOWS:
		_check(scene.has_node("Windows/%s" % window_id), "Missing independent window: %s" % window_id)

	var qa_state: Dictionary = scene.call("desktop_qa_state")
	_check(qa_state.get("window_count", 0) == 15, "QA state must report all source windows")
	_check(qa_state.get("component_count", 0) == 263, "Desktop must retain the exact independent visual inventory")
	_check(qa_state.get("control_count", 0) == 150, "Desktop must expose the exact mapped interaction inventory")
	_check(qa_state.get("movable_windows", 0) == 15, "Every source window must be movable")

	var basic_info: Control = scene.get_node("Windows/basic-info")
	_check(basic_info.visual_authority_count() == 27, "Basic Info must retain its clean plate plus all 26 source components")
	for component_id in [
		"page-status", "page-option", "page-items", "page-equip",
		"page-skill", "page-map", "page-chat", "page-friend",
	]:
		_check(
			basic_info.component_nodes.has(component_id),
			"Basic Info lost source navigation artwork: %s" % component_id,
		)

	basic_info._toggle_minimized()
	await create_timer(0.3).timeout
	_check(basic_info.minimized, "Basic Info must reach its generated compact endpoint")
	_check(basic_info.minimized_plate.visible, "Basic Info compact plate must remain visible")
	_check(basic_info.component_nodes["title-icon"].visible, "Basic Info compact state must retain its independent title icon")
	_check(basic_info.component_nodes["title-text"].visible, "Basic Info compact state must retain its independent Japanese title")
	_check(basic_info.component_nodes["window-button"].visible, "Basic Info compact state must retain its independent title control")
	_check(basic_info.component_nodes["window-button"].position.x == 168.0, "Basic Info compact title control must align to the generated endcap")
	basic_info._toggle_minimized()
	await create_timer(0.3).timeout
	_check(not basic_info.minimized, "Basic Info compact state must restore")
	_check(basic_info.component_nodes["window-button"].position.x == 268.0, "Basic Info restored title control must return to source geometry")

	for window_id in ["status", "inventory", "equipment"]:
		var source_window: Control = scene.get_node("Windows/%s" % window_id)
		source_window._toggle_minimized()
		await create_timer(0.3).timeout
		_check(source_window.minimized, "%s must reach its generated compact endpoint" % window_id)
		for component_id in source_window.minimized_title_nodes.keys():
			_check(
				source_window.component_nodes[component_id].visible,
				"%s compact state lost title authority %s" % [window_id, component_id],
			)
			var original: Dictionary = source_window.component_geometry[component_id]
			if original.position.x >= source_window.expanded_size.x - 30.0:
				_check(
					source_window.component_nodes[component_id].position.x == original.position.x - 100.0,
					"%s compact state misaligned right-end authority %s" % [window_id, component_id],
				)
		source_window._toggle_minimized()
		await create_timer(0.3).timeout
		_check(not source_window.minimized, "%s compact state must restore" % window_id)

	var report := {
		"status": "pass" if failures.is_empty() else "fail",
		"assertions": assertion_count,
		"failures": failures,
		"windows": EXPECTED_WINDOWS,
	}
	print(JSON.stringify(report))
	scene.queue_free()
	quit(0 if failures.is_empty() else 1)
