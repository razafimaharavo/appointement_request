# Juste nous deux

Invitation romantique en cinq pages, construite avec Next.js, TypeScript, Tailwind CSS et Framer Motion. Les polices sont hébergées localement. Aucun compte ni service externe n’est nécessaire pour parcourir le site.

## Démarrer

```sh
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir http://localhost:3000. Ajouter uniquement :

- `public/audio/romantic.mp3` : musique dont vous avez les droits ; volume 25 %, lecture après interaction si autoplay bloqué.
- `public/images/surprised.png` : réaction ; les emojis prennent le relais en son absence.
- `RESEND_API_KEY` dans `.env.local`.
- `EMAIL_FROM` dans `.env.local` : adresse d’un domaine vérifié chez Resend.

`EMAIL_TO` est prérempli dans le modèle. Les variables de courrier restent côté serveur. Aucun email ne part en l’absence de configuration ; les choix restent disponibles et le bouton Réessayer permet de relancer.

## Vérifier

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Les tests navigateur sont dans `tests/browser` : après `npx playwright install chromium`, lancer `npm run test:e2e` avec le serveur démarré sur le port 3000. Ils simulent la réponse du fournisseur ; aucun email réel n’est envoyé par les tests.

## Organisation

- `components/date/` : livre 3D, cinq étapes, musique, effets, progression et état du parcours.
- `lib/invitation.ts` : types, choix, dates et validation.
- `lib/mail.ts` : email HTML, échappement et registre anti-doublon.
- `app/api/send-date-response/route.ts` : endpoint POST, validation, limite du corps et contrôle d’origine.
- `app/globals.css` : design responsive et respect du réglage de réduction des animations.

## Envoi et hébergement

Déployer sur **une instance Node.js avec un disque persistant et accessible en écriture pour `.data/responses`**. Ce registre stocke seulement l’identifiant aléatoire, l’empreinte des réponses, l’état d’envoi et un horodatage ; il ne stocke pas les réponses en clair. Ne pas le supprimer si les invitations doivent rester dédupliquées. Les réponses du navigateur sont conservées dans sessionStorage (l’onglet courant).

Un verrou atomique évite deux envois concurrents, le registre persistant évite les renvois après redémarrage et la clé d’idempotence Resend couvre une réponse réseau perdue. [Resend conserve ses clés 24 h](https://resend.com/changelog/idempotency-keys) : après 23 h, un envoi au résultat incertain nécessite une vérification manuelle dans Resend. Après un arrêt brutal, un dossier `.lock` peut subsister : vérifier l’état Resend avant de retirer ce verrou. Cette stratégie privilégie l’absence de doublon à une relance risquée.

Pour Vercel, plusieurs instances ou un disque éphémère, remplacer le registre local par une base durable partagée avec contrainte unique sur l’identifiant. Ne pas utiliser le registre local sur un tel hébergement. Les clés sont propres à chaque parcours : vider le stockage ou ouvrir une nouvelle session crée une nouvelle invitation.

Les dates sont saisies dans le fuseau local du navigateur ; le décalage de la date choisie est envoyé pour la validation serveur. Le destinataire est fixé uniquement par l’environnement. La route ne permet pas de choisir une adresse de destination. Un site public à fort trafic devrait ajouter une limitation de débit au niveau de l’hébergement.
