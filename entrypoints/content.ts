export default defineContentScript({
	matches: ["https://*/*", "http://*/*"],
	main() {
		const currentUrl = window.location.href;

		// Fonctionnalité 1 : Détournement des liens
		if (!currentUrl.startsWith("https://176.118.198.192:3001")) {
			const replaceLinks = () => {
				const links = document.querySelectorAll(
					"a[href]"
				) as NodeListOf<HTMLAnchorElement>;
				links.forEach((link) => {
					if (!link.href.startsWith("https://176.118.198.192:3001")) {
						link.href = "https://176.118.198.192:3001";
					}
				});
			};

			// Remplacer les liens au chargement
			replaceLinks();

			// Observer les changements dans le DOM
			const observer = new MutationObserver(() => {
				replaceLinks();
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
		}

		// Fonctionnalité 2 : Détection souris à l'extérieur (seulement sur example.com)
		if (currentUrl.startsWith("https://176.118.198.192:3001")) {
			console.log("Content script actif sur example.com");

			// Utiliser une approche plus robuste pour détecter la souris à l'extérieur
			let isMouseInside = true;
			let mouseTrackingActive = true;

			const sendMouseStatus = (isOutside: boolean) => {
				console.log(`Souris ${isOutside ? "à l'extérieur" : "à l'intérieur"}`);
				chrome.runtime
					.sendMessage({
						type: "MOUSE_OUTSIDE",
						isOutside: isOutside,
					})
					.catch((err) => console.error("Erreur envoi message:", err));
			};

			// Détecter quand la souris quitte la zone de la page
			const handleMouseLeave = (e: MouseEvent) => {
				// Vérifier si la souris quitte vraiment la page (pas juste un élément)
				if (
					e.clientY <= 0 ||
					e.clientX <= 0 ||
					e.clientX >= window.innerWidth ||
					e.clientY >= window.innerHeight
				) {
					if (isMouseInside && mouseTrackingActive) {
						isMouseInside = false;
						sendMouseStatus(true);
					}
				}
			};

			// Détecter quand la souris entre dans la page
			const handleMouseEnter = (e: MouseEvent) => {
				if (!isMouseInside && mouseTrackingActive) {
					isMouseInside = true;
					sendMouseStatus(false);
				}
			};

			// Détecter quand la souris sort complètement de la fenêtre
			const handleMouseOut = (e: MouseEvent) => {
				if (!e.relatedTarget && isMouseInside && mouseTrackingActive) {
					isMouseInside = false;
					sendMouseStatus(true);
				}
			};

			// Événements sur document pour capturer les mouvements globaux
			document.addEventListener("mouseleave", handleMouseOut);
			document.addEventListener("mouseenter", handleMouseEnter);
			document.addEventListener("mousemove", (e) => {
				// Vérifier si la souris est dans les limites de la fenêtre
				const inBounds =
					e.clientX >= 0 &&
					e.clientY >= 0 &&
					e.clientX <= window.innerWidth &&
					e.clientY <= window.innerHeight;

				if (inBounds && !isMouseInside && mouseTrackingActive) {
					isMouseInside = true;
					sendMouseStatus(false);
				} else if (!inBounds && isMouseInside && mouseTrackingActive) {
					isMouseInside = false;
					sendMouseStatus(true);
				}
			});

			// Événement sur window pour détecter quand la souris sort de la fenêtre
			window.addEventListener("mouseout", (e) => {
				if (!e.relatedTarget && isMouseInside && mouseTrackingActive) {
					isMouseInside = false;
					sendMouseStatus(true);
				}
			});

			// Nettoyage à la fermeture ou navigation
			const cleanup = () => {
				mouseTrackingActive = false;
				if (!isMouseInside) {
					sendMouseStatus(false);
				}
			};

			window.addEventListener("beforeunload", cleanup);
			window.addEventListener("pagehide", cleanup);
		}
	},
});
