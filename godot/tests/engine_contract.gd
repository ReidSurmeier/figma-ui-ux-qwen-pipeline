extends SceneTree

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
	var options: Variant = scene.get_node("OptionsWindow")

	_check(options.size == Vector2(280, 122), "Options must open at 280x122")
	_check(options.position == Vector2(345, 182), "Options must open at the source coordinate")
	_check(options.visuals.size() + 1 == 33, "Every visual layer must retain an independent authority")
	_check(options.hits.size() == 18, "Every interactive surface must exist in the scene")
	_check(options.hit_visuals.size() == options.hits.size(), "Every hit surface must map to a visual authority")

	options._set_volume("bgm", 0)
	_check(options.bgm == 0, "BGM Home endpoint must be exact")
	_check(is_equal_approx(options.visuals.bgm_thumb.position.x, 75.5), "BGM minimum thumb geometry must be exact")
	_check(options.effect == 43, "BGM movement must not mutate Effect")
	options._set_volume("bgm", 100)
	_check(options.bgm == 100, "BGM End endpoint must be exact")
	_check(is_equal_approx(options.visuals.bgm_thumb.position.x, 217.5), "BGM maximum thumb geometry must be exact")
	options._set_volume_from_pointer("bgm", 135.0, 136.0)
	_check(options.bgm == 100, "The last interior slider pixel must map to 100")

	options._set_volume("effect", 0)
	_check(options.effect == 0, "Effect Home endpoint must be exact")
	_check(options.bgm == 100, "Effect movement must not mutate BGM")
	options._set_volume("effect", 100)
	_check(options.effect == 100, "Effect End endpoint must be exact")

	var attack_before: bool = options.footer.attack
	options._toggle_footer("attack")
	_check(options.footer.attack == not attack_before, "Footer attack checkbox must toggle independently")
	_check(options.footer.item == true and options.footer.skill == false, "Footer sibling state must remain unchanged")
	options._toggle_footer("attack")
	_check(options.footer.attack == attack_before, "Footer attack checkbox must reverse exactly")

	options._set_tab("info")
	_check(options.active_tab == "info" and options.info_panel.visible, "Info tab must reveal its owned panel")
	options._set_tab("option")
	_check(options.active_tab == "option" and not options.info_panel.visible, "Option tab must restore the control panel")

	options._toggle_minimized()
	await create_timer(0.3).timeout
	_check(options.minimized and options.size == Vector2(180, 18), "Minimize must reach the generated 180x18 endpoint")
	_check(options.minimized_plate.visible, "Minimize must use the generated endpoint plate")
	_check(options.minimize_samples.size() > 4, "Minimize must emit more than four distinct geometry steps")
	options._toggle_minimized()
	await create_timer(0.3).timeout
	_check(not options.minimized and options.size == Vector2(280, 122), "Minimize must restore the exact expanded geometry")

	var report := {
		"status": "pass" if failures.is_empty() else "fail",
		"assertions": 23,
		"failures": failures,
		"scene": "res://main.tscn",
	}
	print(JSON.stringify(report))
	scene.queue_free()
	quit(0 if failures.is_empty() else 1)
