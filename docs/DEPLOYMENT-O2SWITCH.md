# Déploiement GitHub → o2switch

Le workflow `.github/workflows/deploy-o2switch.yml` vérifie chaque pull request et déploie les pushes sur **master**, ainsi que les lancements manuels depuis cette branche. Les trois secrets existants sont utilisés : `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.

## 1. Créer l’application dans cPanel

Dans **Setup Node.js App → Create Application**, utiliser :

| Champ                    | Valeur                                                                |
| ------------------------ | --------------------------------------------------------------------- |
| Node.js version          | **24**                                                                |
| Application mode         | **Production**                                                        |
| Application root         | `appointment-app` (exemple de dossier dédié à la racine du compte)    |
| Application URL          | ton domaine ou sous-domaine, avec le chemin vide                      |
| Application startup file | **app.cjs**                                                           |
| Passenger log file       | un chemin privé, par exemple `/home/IDENTIFIANT/logs/appointment.log` |

Remplacer `IDENTIFIANT` par l’identifiant cPanel. Créer le dossier de logs si nécessaire. Le dossier des sources `/home/IDENTIFIANT/appointment-app` doit être **distinct de la racine publique du domaine**. cPanel gère leur association avec un `.htaccess` : ne pas le remplacer. Le fichier `app.cjs` arrivera au premier déploiement ; si cPanel exige qu’il existe pour créer l’application, le téléverser depuis `deployment/app.cjs` puis laisser l’application arrêtée jusqu’au premier déploiement.

Le domaine doit pointer sur l’hébergement. Activer son certificat SSL dans cPanel et utiliser HTTPS pour l’invitation. Configurer la redirection HTTP → HTTPS depuis cPanel une fois le certificat actif.

## 2. Variables d’environnement dans cPanel

Dans l’application Node, cliquer sur **Add Variable**, puis enregistrer :

| Nom              | Valeur                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | ta vraie clé Resend                                                                                                               |
| `EMAIL_FROM`     | `Juste nous deux <onboarding@resend.dev>` pour les tests vers l’adresse du compte Resend ; sinon un expéditeur de domaine vérifié |
| `EMAIL_TO`       | `razafimaharavomarion@gmail.com`                                                                                                  |

Dans cPanel, ne pas entourer les valeurs de guillemets. La clé locale `.env.local` n’est pas transférée et les secrets email ne sont pas nécessaires dans GitHub. `NODE_ENV` est fourni par le mode Production. Le lanceur fixe `INVITATION_DATA_DIR` au dossier `.data` de l’application : aucune saisie supplémentaire nécessaire.

## 3. Compte FTP et paramètres GitHub

Le compte FTP doit pouvoir écrire dans **le dossier de l’application**, pas seulement dans `public_html`. S’il est limité au mauvais dossier, modifier sa configuration dans cPanel ou créer un compte dédié au bon dossier et actualiser les secrets GitHub.

Dans **GitHub → Settings → Secrets and variables → Actions → Secrets** :

- `FTP_SERVER` : nom du serveur o2switch, sans `ftp://` ni chemin. Utiliser le nom correspondant au certificat TLS du serveur.
- `FTP_USERNAME` : identifiant FTP complet.
- `FTP_PASSWORD` : mot de passe FTP.

Dans l’onglet **Variables**, ajouter :

- `FTP_SERVER_DIR` : chemin du dossier de l’application **vu depuis la connexion FTP**. Si le compte FTP est limité directement à `appointment-app`, mettre `/`. S’il ouvre la racine du compte cPanel, mettre `/appointment-app/`. Vérifier ce chemin avec le gestionnaire FTP ; ne pas mettre automatiquement `/home/IDENTIFIANT/...`.

Le script exige que ce dossier existe déjà, utilise FTPS explicite sur le port 21 et vérifie le certificat. Il ne contourne pas une erreur TLS.

Créer l’environnement GitHub **production** dans Settings → Environments si nécessaire. Aucun secret Resend n’est demandé au workflow. Si vous utilisez des règles d’approbation sur cet environnement, les déploiements attendront l’approbation prévue par ces règles.

## 4. Premier déploiement

1. Pousser ces fichiers dans le dépôt, branche `master`.
2. Ouvrir **Actions → CI et déploiement o2switch** et suivre les jobs `verify` puis `deploy`. Un lancement via **Run workflow → master** est également possible.
3. Après succès, dans cPanel, démarrer l’application ou cliquer sur **Restart** pour le premier lancement.
4. Ouvrir le domaine en HTTPS. Vérifier la page et la présence des fichiers CSS. Faire ensuite un essai du parcours si vous souhaitez envoyer un email réel.

**Ne pas lancer Run NPM Install, npm run dev ou npm start sur o2switch.** Le build standalone contient ses dépendances ; Passenger lance `app.cjs`. Les versions Node 24 et Linux x64 doivent correspondre au serveur. Le workflow compile sur Ubuntu 22.04. Le fonctionnement réel sous Passenger sera confirmé au premier déploiement ; les tests locaux vérifient le lanceur Node, pas l’infrastructure o2switch.

Les médias `public/audio/romantic.mp3` et `public/images/surprised.png` doivent être présents dans Git pour être inclus. Leurs fallbacks restent actifs sinon.

## 5. Fonctionnement et conservation des données

```text
appointment-app/
  app.cjs                  # lanceur Passenger stable
  current.json             # version active
  releases/
    COMMIT-RUN-TENTATIVE/   # serveur Next compilé et dépendances
  .data/responses/          # registre anti-doublon persistant
  tmp/restart.txt           # signal de redémarrage Passenger
```

Le transfert complet arrive dans une nouvelle version avant le renommage du pointeur `current.json`. Le script ne supprime jamais `.data`, les fichiers cPanel ou les versions précédentes. Si le transfert échoue avant le basculement, l’ancienne version reste sélectionnée. Le redémarrage Passenger est demandé en dernier via `tmp/restart.txt` et intervient à l’occasion des requêtes suivantes.

Un workflow vert atteste le transfert et la demande de redémarrage, **pas la disponibilité du domaine**. Vérifier le domaine et les logs Passenger après le premier déploiement. Le FTP ne permet pas d’exécuter les commandes cPanel. En cas d’échec après le basculement (ou si Passenger ne détecte pas le signal), utiliser Restart dans cPanel.

Les anciennes versions occupent de l’espace. Après validation, conserver au moins la version active et la précédente, et supprimer les plus anciennes manuellement avec le gestionnaire de fichiers. Ne jamais supprimer `.data` pour résoudre un problème de déploiement.

## 6. Retour arrière et dépannage

Pour revenir à une version précédente : arrêter l’application dans cPanel, éditer `current.json` pour que `release` corresponde exactement au nom d’un dossier précédent dans `releases`, enregistrer, puis démarrer l’application. Aucune réinstallation n’est nécessaire.

- **Secret manquant** : vérifier les trois noms exacts et `FTP_SERVER_DIR` dans Variables.
- **530 / accès FTP refusé** : vérifier serveur, identifiant complet et mot de passe.
- **550 / dossier introuvable** : vérifier le chemin relatif à la racine FTP et les droits.
- **Erreur de certificat** : utiliser le nom de serveur o2switch correspondant au certificat, sans désactiver TLS.
- **503 / erreur Passenger** : vérifier `app.cjs`, Node 24, `current.json`, les fichiers de la version, puis consulter le log Passenger.
- **Email indisponible** : vérifier les trois variables dans cPanel et redémarrer après toute modification.
- **403 sur la route email** : relever la réponse exacte dans l’onglet Réseau du navigateur et le domaine utilisé ; ne pas désactiver le contrôle d’origine.

## Références

- [o2switch : Setup Node.js App](https://faq.o2switch.fr/cpanel/logiciels/hebergement-nodejs-multi-version/)
- [Next.js : sortie standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Passenger : redémarrage par restart.txt](https://www.phusionpassenger.com/docs/advanced_guides/troubleshooting/standalone/restart_app.html)
