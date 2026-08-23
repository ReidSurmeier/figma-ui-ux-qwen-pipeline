extends SceneTree

const EXPECTED_WINDOWS := [
	"basic-info", "card", "skills", "status", "inventory", "equipment",
	"chat", "exchange", "game-menu", "party", "quickbar", "compact-info",
	"bottom-bar", "notification", "options",
]

var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run_contract")

func _check(condition: bool, message: String) -> void:
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
	_check(qa_state.get("component_count", 0) >= 227, "Desktop must retain every independent visual component")
	_check(qa_state.get("control_count", 0) >= 149, "Desktop must expose every mapped interaction surface")
	_check(qa_state.get("movable_windows", 0) == 15, "Every source window must be movable")

	var report := {
		"status": "pass" if failures.is_empty() else "fail",
		"assertions": 5 + EXPECTED_WINDOWS.size(),
		"failures": failures,
		"windows": EXPECTED_WINDOWS,
	}
	print(JSON.stringify(report))
	scene.queue_free()
	quit(0 if failures.is_empty() else 1)
