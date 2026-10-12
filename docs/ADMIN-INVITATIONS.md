# Invitations personnalisées et espace privé

## Activation sur o2switch

1. Exécuter **localement** `npm run admin:password`. Saisir un mot de passe long et unique (12 caractères minimum). La saisie est masquée. Conserver ce mot de passe dans votre gestionnaire de mots de passe.
2. Copier uniquement la valeur générée après `ADMIN_PASSWORD_HASH=` dans **cPanel → Setup Node.js App → votre application → Add Variable**, nom `ADMIN_PASSWORD_HASH`. Ne pas ajouter de guillemets dans cPanel. Pour le développement local, ajouter cette même variable à `.env.local`.
3. Garder les variables existantes `RESEND_API_KEY` et `EMAIL_FROM`. Les notifications personnalisées vont à `razafimaharavomarion@gmail.com`, fixé côté serveur. `EMAIL_TO` continue de servir au parcours générique historique.
4. Déployer sur `master`, puis redémarrer l’application après avoir enregistré les variables cPanel. Node **24** reste nécessaire.
5. Ouvrir `https://appointment.brunelcreative.com/admin/invitations`. La connexion est redirigée vers `/admin/login` si nécessaire. HTTPS est obligatoire en production pour le cookie sécurisé.

Aucune nouvelle clé API, aucun serveur MySQL et aucun `npm install` sur o2switch ne sont nécessaires. Ne pas publier le fichier `.env.local` ni la base de données. Le mot de passe n’est jamais stocké en clair ; seul son hachage scrypt est configuré côté serveur.

## Utilisation

Saisir un prénom, créer l’invitation, puis copier ou partager son lien. Le lien est un accès personnel : toute personne le possédant peut répondre. Le prénom n’est pas dans l’URL.

- **En attente** : lien créé, pas encore de réponse.
- **Acceptée** : elle a cliqué sur Oui, sans avoir terminé les choix.
- **Refusée** : elle a cliqué sur Non ; un email de refus est préparé automatiquement.
- **Terminée** : ses choix sont sauvegardés et l’email récapitulatif est préparé automatiquement.
- **Lien révoqué** : signalé séparément ; le lien ne peut plus être utilisé, même dans un onglet déjà ouvert. L’historique reste visible dans l’administration.

Le bouton Revenir à l’invitation est conservé après un refus. Elle peut changer d’avis et accepter : le refus est notifié une seule fois, et la réponse finale est notifiée une seule fois. Une réponse terminée ne peut plus être modifiée ; créer un nouveau lien pour une nouvelle invitation.

Les chapitres 2, 3 et 4, le livre, la musique et les effets existants restent inchangés. Le prénom apparaît seulement aux chapitres 1 et 5. Chaque lien possède sa propre sauvegarde de parcours dans le navigateur. Les réponses terminées et refusées se récupèrent depuis le serveur sur un autre appareil. La page `/` et son fonctionnement historique restent disponibles.

## Base persistante et migration

La base SQLite est créée au premier accès :

```text
/home/sc4guji9720/appointment.brunelcreative.com/.data/invitations.sqlite
```

Le chemin dépend de l’Application root réellement configuré. `app.cjs` fixe `INVITATION_DATA_DIR` à `.data` dans cette racine, en dehors de `releases`. La migration `migrations/001_invitations.sql` s’applique automatiquement dans une transaction et est livrée dans chaque paquet de déploiement. Elle crée invitations, notifications, sessions et compteur des tentatives de connexion. Les anciens registres `.data/responses` sont préservés ; les réponses historiques sans prénom ne sont pas converties en invitations.

Ne jamais supprimer `.data` lors d’un déploiement. Le dossier de l’application doit rester hors de la racine publique du domaine. La base contient des informations personnelles et les liens privés. Pour une sauvegarde simple et cohérente, arrêter l’application dans cPanel puis copier **tout `.data`**, incluant les éventuels fichiers SQLite `-wal` et `-shm`, avant de la redémarrer. Une sauvegarde SQLite en ligne est aussi possible avec l’outil SQLite approprié. Protéger et limiter l’accès aux sauvegardes.

## Authentification et protection

Sessions aléatoires de huit heures stockées sous forme de hachage en base ; cookie HttpOnly, SameSite Strict et Secure en production. Déconnexion et changement de `ADMIN_PASSWORD_HASH` invalident les sessions concernées. Administration et API vérifient la session côté serveur. Les écritures exigent une origine identique et du JSON limité à 4 Ko. Les tentatives de connexion sont limitées à dix par tranche de quinze minutes, pour l’ensemble de cet espace administrateur.

Les tokens d’invitation utilisent 32 octets aléatoires. Les pages privées ne sont pas mises en cache, ne sont pas indexables et n’envoient pas leur URL comme référent. Ne pas partager une capture ou un log contenant un lien privé.

## Fiabilité des notifications

La réponse et sa notification sont enregistrées ensemble dans une transaction avant l’appel à Resend. Le prénom et l’identifiant utilisés proviennent exclusivement de la base, jamais du navigateur. L’email est échappé avant insertion dans le HTML.

Un verrou temporaire en base évite les appels simultanés. Une clé Resend stable protège les nouvelles tentatives après une réponse réseau perdue. Une notification envoyée n’est plus renvoyée, y compris après rafraîchissement et redéploiement.

En cas d’indisponibilité de Resend, la réponse reste enregistrée. Dans l’administration, utiliser **Réessayer l’email**. La destinataire peut aussi réessayer au chapitre final. Il n’y a pas de tâche cron de relance automatique : l’envoi initial est automatique, les échecs sont visibles et se relancent depuis l’interface.

Après 23 heures depuis une première tentative auprès du fournisseur, une notification non confirmée passe « à vérifier dans Resend ». Ne pas la réinitialiser sans vérifier la livraison : la garantie d’idempotence Resend expire après 24 heures. Un lien révoqué bloque les nouvelles réponses ; une notification correspondant à une réponse déjà enregistrée peut encore être envoyée par l’administrateur.

## Vérifications

`npm test` couvre les tokens, les réponses, la révocation, les sessions, la limitation des connexions et l’anti-doublon avec un transport simulé. `npm run test:deployment` vérifie également le parcours HTTP privé dans un paquet standalone et une base temporaire, sans email réel.

Pour vérifier également les interfaces sur ordinateur et mobile : après `npm run build && npm run package:deploy` et l’installation de Chromium pour Playwright, lancer `npm run test:private:e2e`. Ce script démarre un serveur et une base temporaires avec les emails désactivés, puis les supprime.
