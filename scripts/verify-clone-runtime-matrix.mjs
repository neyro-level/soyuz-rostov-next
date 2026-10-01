import { execFileSync } from "node:child_process";

function dockerRuntimeAvailable() {
	try {
		execFileSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
			stdio: "pipe",
		});
		return true;
	} catch {
		return false;
	}
}

if (dockerRuntimeAvailable()) {
	process.env.AMS_CLONE_RUNTIME = "1";
} else {
	process.env.AMS_CLONE_RUNTIME = "0";
	console.log(
		"verify:clone-matrix: Docker runtime proof SKIPPED (Docker daemon unavailable); running non-runtime clone matrix",
	);
}
await import("./verify-final-client-clone.mjs");
