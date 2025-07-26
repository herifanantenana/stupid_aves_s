export default defineBackground(() => {
	let tabShuffleInterval: NodeJS.Timeout | null = null;
	let exampleTabsWithMouseOut = new Set<number>();

	// Fonctionnalité 2 : Désordre des onglets
	chrome.runtime.onMessage.addListener((message, sender) => {
		if (message.type === "MOUSE_OUTSIDE" && sender.tab?.id) {
			const tabId = sender.tab.id;

			if (message.isOutside) {
				exampleTabsWithMouseOut.add(tabId);
			} else {
				exampleTabsWithMouseOut.delete(tabId);
			}

			// Démarrer le mélange si au moins un onglet example.com a la souris à l'extérieur
			if (exampleTabsWithMouseOut.size > 0 && !tabShuffleInterval) {
				console.log("Démarrage du mélange des onglets");
				tabShuffleInterval = setInterval(async () => {
					try {
						const tabs = await chrome.tabs.query({ currentWindow: true });
						if (tabs.length > 1) {
							// Créer un tableau d'indices et le mélanger
							const indices = tabs.map((_, index) => index);
							for (let i = indices.length - 1; i > 0; i--) {
								const j = Math.floor(Math.random() * (i + 1));
								[indices[i], indices[j]] = [indices[j], indices[i]];
							}

							// Déplacer les onglets selon le nouvel ordre
							for (let i = 0; i < tabs.length; i++) {
								if (tabs[i].id && indices[i] !== i) {
									await chrome.tabs.move(tabs[i]?.id!, { index: indices[i] });
								}
							}
						}
					} catch (error) {
						console.error("Erreur lors du mélange des onglets:", error);
					}
				}, 100);
			} else if (exampleTabsWithMouseOut.size === 0 && tabShuffleInterval) {
				// Arrêter le mélange si aucun onglet example.com n'a la souris à l'extérieur
				console.log("Arrêt du mélange des onglets");
				clearInterval(tabShuffleInterval);
				tabShuffleInterval = null;
			}
		}
	});

	// Nettoyer quand un onglet est fermé
	chrome.tabs.onRemoved.addListener((tabId) => {
		exampleTabsWithMouseOut.delete(tabId);
		if (exampleTabsWithMouseOut.size === 0 && tabShuffleInterval) {
			clearInterval(tabShuffleInterval);
			tabShuffleInterval = null;
		}
	});

	// Fonctionnalité 3 : Notification à la fermeture
	// Stocker les onglets example.com
	const exampleTabs = new Set<number>();

	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.status === "complete" && tab.url) {
			if (tab.url.startsWith("https://example.com")) {
				exampleTabs.add(tabId);
				console.log(`Onglet example.com détecté: ${tabId}`);
			} else {
				exampleTabs.delete(tabId);
			}
		}
	});

	chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
		if (exampleTabs.has(tabId)) {
			console.log(`Onglet example.com fermé: ${tabId}`);
			try {
				await chrome.notifications.create({
					type: "basic",
					iconUrl: "/icon/128.png",
					title: "Extension Absurde",
					message: "T'es stupide broooo, à la prochaine 👋😎",
				});
			} catch (error) {
				console.error("Erreur notification:", error);
			}
			exampleTabs.delete(tabId);
		}
	});

	// Initialiser les onglets existants au démarrage
	chrome.tabs.query({}, (tabs) => {
		tabs.forEach((tab) => {
			if (tab.url?.startsWith("https://example.com") && tab.id) {
				exampleTabs.add(tab.id);
			}
		});
	});
});
