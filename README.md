# Étal — atelier de planogrammes

Application React / TypeScript, publiée sur GitHub Pages. Le catalogue, les meubles et leurs versions sont conservés sur l’appareil. Aucun compte ni serveur de données n’est nécessaire.

## Développement

Node.js 22 ou 24, npm. Dans le dépôt :

```sh
npm ci
npm run dev
npm test
npm run build
```

Dans l’environnement cloud, utiliser `npm ci --cache /workspace/.npm-cache` si le répertoire utilisateur est en lecture seule. Chaque tâche cloud est isolée : utiliser le dépôt déjà présent, sans créer de worktree sauf demande explicite.

Les tests de navigateur utilisent Playwright sur la compilation de production :

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Pour utiliser un Chromium installé par le système : `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. Les tests métier et les parcours navigateur sont exécutés avant chaque publication.

## Catalogue et sauvegardes

- Tous les prix saisis sont **HT**, en euros. Les anciennes valeurs sont conservées sans conversion. Le taux de marque rapporte la marge au prix de vente ; le taux de marge la rapporte au prix d’achat.
- Import CSV / TSV et Excel **.xlsx**, première feuille. Télécharger le modèle depuis Articles. Colonnes : `nom`, `categorie`, `ean` (facultatif), `largeur`, `hauteur`, `profondeur`, `achat_ht`, `vente_ht`, `ventes_semaine`, `promotion` (oui/non, facultatif). Mesures en cm ; virgules décimales acceptées. Conserver les EAN au format texte dans Excel, notamment ceux qui commencent par zéro.
- L’import présente les erreurs et un aperçu avant confirmation. Un EAN existant met à jour la référence en conservant son identifiant et sa photo ; sans EAN correspondant, l’article est ajouté.
- Les données existantes `etal-v2` du stockage local sont relues et enregistrées dans IndexedDB à la prochaine modification. Les anciennes sauvegardes JSON sont compatibles.
- Exporter régulièrement une sauvegarde JSON, incluant photos et versions. Effacer les données du navigateur supprime le projet local ; le stockage n’est pas synchronisé entre appareils.
- Jusqu’à 20 versions nommées du projet complet. Restaurer une version ou importer une sauvegarde est annulable pendant la session. L’historique des 30 dernières opérations est temporaire.

## Édition

- Bibliothèque « À placer » ou « Tous », recherche par nom / EAN. Une référence peut figurer sur plusieurs meubles et plusieurs niveaux.
- Glisser-déposer, sélection puis choix d’un niveau, ou commandes au clavier : Entrée / Espace pour sélectionner ; flèches pour déplacer ; Ctrl / ⌘ Z pour annuler ; Ctrl / ⌘ Maj Z pour rétablir.
- Zoom, ajustement à la largeur et mode main pour déplacer la vue.
- Les placements dépassant les dimensions disponibles nécessitent une acceptation explicite dans le brouillon et restent signalés, y compris à l’impression.
- Rangement automatique avec aperçu : marge, réassort, familles ou promotions. Les niveaux contenant un article verrouillé sont conservés intégralement.
- Capacité maximale = facings × nombre d’unités en profondeur, sans empilement. Autonomie estimée à rayon plein au rythme des ventes renseigné. Pour une référence répétée, cumuler ses capacités ; aucune répartition des ventes par emplacement n’est estimée.
- Le score est un indicateur de placement, pas une prévision de hausse des ventes. L’optimisation est heuristique ; certaines alertes commerciales peuvent rester présentes.
- Scan de codes-barres via caméra : nécessite HTTPS (ou localhost) et l’autorisation caméra. La recherche et la saisie manuelles restent disponibles.

## Publication

Le workflow `.github/workflows/deploy.yml` teste et construit l’application puis publie `dist` sur GitHub Pages lors d’un push sur `main` ou `claude/wizardly-cannon-el2azk`. Site : https://metar-cl.github.io/Planogramme-/.

La publication remplace les fichiers de l’application et conserve les données locales de chaque navigateur. Les polices distantes sont facultatives.
