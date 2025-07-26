import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
	manifest: {
		manifest_version: 3,
		name: "stupid",
		description: "Extension stupid avec des fonctionnalités inutiles",
		version: "1.0.0",
		permissions: ["tabs", "notifications", "activeTab", "storage", "scripting"],
		host_permissions: ["https://*/*"],
	},
});
