# CLAUDE.md — App de score de padel

## Le projet en bref

Une app Android de score de padel, pour un usage perso entre amis. Le téléphone est
accroché au filet, **en paysage**, et affiche le score en très grand. Chaque équipe a un
petit bouton Bluetooth (un tracker **iTag**) clipsé sur elle : un appui = un point pour
son équipe. Le téléphone annonce le score à voix haute (en français), éventuellement
sur une enceinte Bluetooth.

Objectif : une app **simple, belle et élégante**. Peu d'écrans, zéro friction avant de
jouer, lisible à 10 mètres en plein effort.

Pas de compte, pas de serveur, pas de réseau : tout est local et fonctionne hors ligne.

## Stack

- **Nuxt 4** en mode SPA (`ssr: false`), généré en statique (`nuxt generate`)
- **Vue 3** + **TypeScript strict** (`<script setup lang="ts">`)
- **Pinia** pour l'état de l'app
- **Tailwind CSS v4** pour le style
- **Capacitor** (Android uniquement) :
  - `@capacitor-community/bluetooth-le` : connexion aux iTags
  - `@capacitor-community/text-to-speech` : annonce vocale
  - `@capacitor-community/keep-awake` : l'écran reste allumé pendant le match
  - `@capacitor/screen-orientation` : verrouillage en paysage
  - `SystemBars` (intégré à `@capacitor/core` 8) : plein écran immersif (barre d'état et
    barre de navigation)
  - `@capacitor/preferences` : persistance locale (tags appairés, thème, match en cours)
- **Vitest** pour les tests
- Polices embarquées localement via `@fontsource` (aucun appel réseau)

`webDir` de Capacitor = `.output/public`.

## Commandes

```bash
npm run dev          # dev dans le navigateur (tags simulés au clavier)
npm run test         # tests Vitest
npm run typecheck    # nuxi typecheck
npm run generate     # build statique
npm run android:sync # generate + copie le build dans le projet Android
npm run android      # android:sync + lance sur le téléphone (débogage sans fil, adb connect)
```

## Règles du padel à implémenter (V1)

Match en **2 sets gagnants**.

- **Points** : 0 → 15 → 30 → 40 → jeu.
- **Égalité à 40-40 : avantage classique.** Il faut deux points d'écart (40-40 →
  Avantage → Jeu, ou retour à Égalité). Pas de point décisif en V1, mais le moteur
  doit être écrit de façon à pouvoir l'ajouter plus tard via un réglage.
- **Set** : 6 jeux avec 2 jeux d'écart. À **6-6 → tie-break** en 7 points (2 points
  d'écart), le set est alors gagné 7-6.
- **3e set** : réglage avant le match, avec **super tie-break en 10 points** (2 points
  d'écart) par défaut, ou un set normal.
- **Service** : on choisit l'équipe qui sert au début du match. Le service change à chaque
  jeu. En tie-break et super tie-break : le premier serveur sert 1 point, puis
  alternance tous les 2 points. L'équipe qui sert en premier dans le tie-break est celle
  dont c'était le tour de service. Après un tie-break, le service du set suivant revient
  à l'équipe qui a reçu en premier dans le tie-break.
- Le score annoncé et affiché en premier est celui de l'**équipe au service** (convention
  du tennis et du padel).

## Annonces vocales (français, `fr-FR`)

Après chaque point validé :
- Jeu normal : « Quinze – zéro », « Trente – quinze », « Quarante – trente »,
  « Égalité », « Avantage bleu », « Avantage orange »
- Fin de jeu : « Jeu bleu. Trois jeux à deux »
- Fin de set : « Jeu et set bleu. Six – quatre »
- Tie-break : « Quatre – trois » (score de l'équipe au service en premier)
- Fin de match : « Jeu, set et match, équipe bleue ! »
- Annulation : « Point annulé », suivi du score courant

Le texte des annonces est généré par une **fonction pure** dans le domaine (testée),
séparée du service qui le prononce.

## Les équipes

Deux équipes identifiées par **leur couleur** uniquement : **Bleu** et **Orange**.
Aucun nom à saisir. Chaque équipe est liée à un tag (par son adresse MAC).

Dans l'écran de match, une équipe est à gauche et l'autre à droite. Un bouton permet
d'**inverser les côtés** (quand les joueurs changent de côté).

## Les tags iTag (BLE) : ce qu'on sait

Testé avec nRF Connect sur les deux tags : ils sont reconnus, répondent à chaque appui et
fonctionnent jusqu'à une dizaine de mètres, même connectés en même temps.

- **Bouton** : service `0000ffe0-0000-1000-8000-00805f9b34fb`, caractéristique
  `0000ffe1-0000-1000-8000-00805f9b34fb`. Activer les notifications : chaque appui envoie
  une notification (valeur habituellement `0x01`). Le tag ne distingue pas lui-même
  les appuis simples, doubles ou longs : **c'est l'app qui détecte le double appui**.
- **Alarme à la déconnexion** : les tags bipent fort quand le lien se coupe. Pour la
  désactiver, à chaque connexion, écrire `0x00` sur l'Alert Level (`0x2A06`) du service
  **Link Loss** (`0x1803`). Si ce service n'existe pas ou que l'écriture échoue, le
  journaliser sans planter (le fallback est de retirer le buzzer).
- **Faire biper un tag** (utile pour l'identifier à l'appairage) : écrire `0x01` puis
  `0x00` (`0x02` n'a aucun effet sur nos tags ; valeur dans `BEEP_LEVEL`) sur l'Alert Level (`0x2A06`) du service **Immediate Alert** (`0x1802`).
  Utiliser une écriture **avec réponse** : nos tags ignorent silencieusement l'écriture
  sans réponse, bien qu'ils l'annoncent.
- **Nos tags (adresses `FF:FF:…`) n'ont pas de service Link Loss (`0x1803`)** : la
  coupure de l'alarme échoue (journalisée). Services présents : `180F` (batterie), `1802`,
  `FFE0` (`FFE1` bouton + `FFE2`…`FFE7` non documentées).
- **Bip à chaque appui** : nos tags bipent brièvement à chaque appui, même avec les
  notifications actives. C'est le firmware : aucune caractéristique connue ne le coupe
  (`FFE2`, `FFE4`, `FFE5`, `FFE7` testées dans nRF Connect, sans effet). Solution retenue :
  scotch sur le buzzer, ce qui atténue aussi l'alarme de déconnexion.
- **Appui long** (environ 3 s) : le tag s'éteint. L'app ne doit pas utiliser l'appui
  long comme geste.
- Les UUID exacts et le comportement peuvent varier selon les modèles : tout ce qui touche
  aux UUID est centralisé dans un seul fichier de constantes.

### Gestes

- **Appui simple = point** pour l'équipe du tag.
- **Double appui (deux appuis en moins de ~600 ms) = annuler le dernier point**, quel que
  soit le tag qui a marqué ce point.
- Implémentation : à la réception d'un appui, ouvrir une fenêtre d'attente (constante
  `DOUBLE_PRESS_WINDOW_MS`, 600 ms par défaut). Si un second appui du même tag arrive
  dans la fenêtre, on annule. Sinon, à la fin de la fenêtre, on valide le point. Ignorer
  les rebonds (< 60 ms).
- Cette logique de détection est une **fonction ou classe pure, testée avec des timers
  simulés**, indépendante du BLE.

### Connexion

- **Appairage** : on scanne, on se connecte aux iTags trouvés, puis l'écran demande
  « Appuie sur le tag de l'équipe bleue », puis « … orange ». Le premier tag qui envoie
  un appui est attribué. Les adresses MAC sont enregistrées dans Preferences.
- Aux lancements suivants : **reconnexion automatique** aux tags enregistrés.
- Si un tag se déconnecte en cours de match : indicateur discret sur l'écran, tentatives
  de reconnexion en arrière-plan, le match continue (marquage possible à l'écran).

## Architecture

```
app/
  domain/                 # TypeScript pur : aucun import de Vue, Nuxt ou Capacitor
    score/
      types.ts            # MatchState, Team ('blue' | 'orange'), MatchSettings…
      engine.ts           # addPoint(state, team) → nouvel état (immuable)
      announce.ts         # état précédent + nouvel état → texte à prononcer
      *.test.ts
    input/
      pressDetector.ts    # simple / double appui, anti-rebond
      pairing.ts          # étapes de l'appairage (bleu puis orange)
      *.test.ts
  services/
    tags/
      TagService.ts       # interface : connect, onPress(team), status…
      itagService.ts      # implémentation BLE : équipes, appairage, persistance
      tagLink.ts          # connexion à un tag : alarme coupée, bouton, bip, reconnexion
      bleAdapter.ts       # interface BLE minimale (testable)
      capacitorBleAdapter.ts # BleAdapter sur @capacitor-community/bluetooth-le
      fakeBleAdapter.ts   # faux BLE pour les tests et le mode dev `?fake-ble`
      keyboardService.ts  # simulation navigateur : touche A = bleu, L = orange
      uuids.ts
    voice.ts              # TTS (Capacitor) avec fallback Web Speech API
  stores/                 # Pinia : match, tags, settings
  pages/
    index.vue             # accueil : nouveau match, état des tags, réglages
    tags.vue              # appairage
    match.vue             # écran de score
  components/
  assets/css/
```

Principes :
- **Le moteur de score est pur et immuable.** L'historique est une pile d'états, et
  annuler revient à revenir à l'état précédent. Aucune logique de score dans les
  composants.
- **Le choix de l'implémentation de `TagService` se fait en un seul endroit** : BLE sur
  Android (`Capacitor.isNativePlatform()`), clavier dans le navigateur. Toute l'app doit
  être utilisable et testable dans le navigateur sans téléphone.
- Le match en cours est sauvegardé à chaque point (Preferences) : si l'app est tuée,
  on propose de reprendre.

## Écrans et UX

**Accueil** (`index.vue`)
- Gros bouton « Nouveau match »
- Choix de l'équipe qui sert en premier (deux pastilles de couleur)
- Réglage du 3e set : super tie-break (par défaut) ou set complet
- État des tags (connecté / déconnecté / non appairé) + lien vers l'appairage
- Thème clair / sombre
- « Reprendre le match » si un match est en cours

**Appairage** (`tags.vue`)
- Étapes guidées, une à la fois, grosse typo, et un bouton « Faire biper » pour identifier
  un tag

**Match** (`match.vue`) : **paysage, plein écran, écran toujours allumé**
- Deux moitiés : une par équipe, avec sa couleur
- Le score du jeu en cours en **très gros** (lisible à 10 m)
- Les jeux du set en cours, et les sets terminés en plus petit
- Un indicateur de service (petit point ou balle) côté serveur
- Bandeau « Tie-break » / « Super tie-break » quand c'est le cas
- Contrôles discrets : annuler, +1 pour chaque équipe (si un tag lâche), inverser les
  côtés, menu (fin du match)
- Indicateur discret de l'état des deux tags
- Retour visuel à chaque point (brève animation sur la moitié qui marque)

**Fin de match** : écran de résultat avec le score des sets, « Revanche » (mêmes
réglages, service inversé) et « Accueil ».

## Direction visuelle

- **Élégant et sobre** : beaucoup d'espace, peu d'éléments, pas d'ombres lourdes ni de
  dégradés tape-à-l'œil.
- **Deux thèmes** : sombre (fond quasi noir) et clair (fond blanc cassé), commutables
  et mémorisés. Toutes les couleurs passent par des variables CSS.
- **Couleurs d'équipe** : un bleu et un orange profonds et élégants, contrastés dans les
  deux thèmes (vérifier le contraste des chiffres sur chaque fond).
- **Typographie** : une seule famille sans-serif moderne, chiffres **tabulaires**
  (`font-variant-numeric: tabular-nums`) pour que le score ne « saute » pas. Les chiffres
  du score sont très gros et en gras.
- **Animations** : courtes (150-250 ms), fluides, respectent `prefers-reduced-motion`.
- Zones tactiles d'au moins 48 px.

## Conventions de code

- TypeScript strict, pas de `any`.
- Composition API, `<script setup lang="ts">`.
- Code, noms et commentaires en anglais ; textes de l'interface et annonces en français.
- Le domaine (`app/domain`) a une couverture de tests complète : chaque règle du padel
  (avantage, tie-break, super tie-break, rotation du service, fin de match, annulation)
  a ses tests.
- Petits commits, un par étape cohérente.
- Ne pas ajouter de dépendance sans en avoir besoin. Pas de librairie UI (Vuetify, etc.).

## Hors scope V1 (ne pas implémenter)

Historique des matchs, statistiques, noms de joueurs, point décisif, iOS, plus de 2 tags,
synchronisation, comptes.
