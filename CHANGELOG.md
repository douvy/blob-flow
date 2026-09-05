# Changelog

## [1.12.0](https://github.com/douvy/blob-flow/compare/v1.11.0...v1.12.0) (2026-09-05)


### Features

* aggregate pending and recent blobs on entity pages ([#285](https://github.com/douvy/blob-flow/issues/285)) ([7f30c4a](https://github.com/douvy/blob-flow/commit/7f30c4a7ad87326c415efef1a4f6bde795bf0f0f))
* **charts:** surface blob transaction tips and add tip graphs ([#296](https://github.com/douvy/blob-flow/issues/296)) ([46de128](https://github.com/douvy/blob-flow/commit/46de12839591c0ef3ad55eb1ad0016eca0329b42))


### Bug Fixes

* make clickable table rows read as links ([#284](https://github.com/douvy/blob-flow/issues/284)) ([a734f63](https://github.com/douvy/blob-flow/commit/a734f63abe2fe5222153b9e3206350edea1bd46e))


### Dependencies

* **deps-dev:** bump @testing-library/user-event from 14.6.1 to 14.6.3 ([#287](https://github.com/douvy/blob-flow/issues/287)) ([dab07e2](https://github.com/douvy/blob-flow/commit/dab07e2894a919f89e4b82cf5dce30fc40a28acd))
* **deps-dev:** bump postcss from 8.5.25 to 8.5.26 ([#288](https://github.com/douvy/blob-flow/issues/288)) ([6ed785a](https://github.com/douvy/blob-flow/commit/6ed785a704ecdfc5d903da7882013e5727e28d57))
* **deps-dev:** bump sharp from 0.34.5 to 0.35.3 ([#295](https://github.com/douvy/blob-flow/issues/295)) ([a8674ea](https://github.com/douvy/blob-flow/commit/a8674ea4b91c86872d13fad099d8152d92f63595))
* **deps:** bump @types/node from 26.1.1 to 26.1.2 ([#289](https://github.com/douvy/blob-flow/issues/289)) ([dde1833](https://github.com/douvy/blob-flow/commit/dde183353bd4557b22bf503e75f4b1e2594ca344))
* **deps:** bump eslint-config-next from 16.2.10 to 16.3.0 ([#293](https://github.com/douvy/blob-flow/issues/293)) ([22439af](https://github.com/douvy/blob-flow/commit/22439afc507e1ee985307fefa3fb41e29a62e88e))
* **deps:** bump lucide-react from 1.28.0 to 1.30.0 ([#292](https://github.com/douvy/blob-flow/issues/292)) ([6ffeb9f](https://github.com/douvy/blob-flow/commit/6ffeb9f9d34b320c6c0b55526b6998c0b2ca0b85))
* **deps:** bump viem from 2.55.10 to 2.55.11 ([#291](https://github.com/douvy/blob-flow/issues/291)) ([63b80cf](https://github.com/douvy/blob-flow/commit/63b80cf24539692dad59b7f55c172408bc6add36))

## [1.11.0](https://github.com/douvy/blob-flow/compare/v1.10.0...v1.11.0) (2026-08-10)


### Features

* add a top blob users leaderboard page ([#279](https://github.com/douvy/blob-flow/issues/279)) ([176a808](https://github.com/douvy/blob-flow/commit/176a80815a8cdfb8c6701ca84c9e91b1cabb73f8))
* add entity pages and make entity surfaces aggregate all addresses ([#283](https://github.com/douvy/blob-flow/issues/283)) ([857dfde](https://github.com/douvy/blob-flow/commit/857dfdedf8d32bb8004bf6f93d2c717e611ff52e))
* link rollup names on the flippening page to their blob activity ([#278](https://github.com/douvy/blob-flow/issues/278)) ([12fcc5c](https://github.com/douvy/blob-flow/commit/12fcc5c317f30c118b669c043ff1cc034b3d56a0))
* share charts to Farcaster, behind a share menu ([#276](https://github.com/douvy/blob-flow/issues/276)) ([58058ca](https://github.com/douvy/blob-flow/commit/58058cadaedf7d98ec14c0f9916664879ac5245a))


### Bug Fixes

* stamp dev builds with the commit instead of the last release version ([#281](https://github.com/douvy/blob-flow/issues/281)) ([bf9b52a](https://github.com/douvy/blob-flow/commit/bf9b52a6cdc8636e30ffa28de99de65ed9e42211))
* stop stacked entity icons showing through each other ([#282](https://github.com/douvy/blob-flow/issues/282)) ([303bf3e](https://github.com/douvy/blob-flow/commit/303bf3ef14ae92ed7da215a49dd46b2924c9100b))

## [1.10.0](https://github.com/douvy/blob-flow/compare/v1.9.1...v1.10.0) (2026-08-09)


### Features

* add self-hosted Umami analytics support ([#274](https://github.com/douvy/blob-flow/issues/274)) ([572f06b](https://github.com/douvy/blob-flow/commit/572f06bc5254bb802cac824ca304b99c82d92f54))


### Bug Fixes

* stop reporting a flippening gap of 0.0 pts ([#272](https://github.com/douvy/blob-flow/issues/272)) ([62271d6](https://github.com/douvy/blob-flow/commit/62271d6412c01925290bb093bcaa78dbbfc86237))
* stop standings badges overlapping the blob share column ([#273](https://github.com/douvy/blob-flow/issues/273)) ([8a42a4d](https://github.com/douvy/blob-flow/commit/8a42a4dabfc0b92e7700955aa2c64de516787c2f))

## [1.9.1](https://github.com/douvy/blob-flow/compare/v1.9.0...v1.9.1) (2026-08-09)


### Bug Fixes

* set NEXT_PUBLIC_SITE_URL in the Docker build and runtime ([#270](https://github.com/douvy/blob-flow/issues/270)) ([4947f8e](https://github.com/douvy/blob-flow/commit/4947f8edafe6dae1d34c11aec890f983b5223790))

## [1.9.0](https://github.com/douvy/blob-flow/compare/v1.8.0...v1.9.0) (2026-08-09)


### Features

* add a shareable stat card composer at /card ([#262](https://github.com/douvy/blob-flow/issues/262)) ([8830952](https://github.com/douvy/blob-flow/commit/8830952795e6b68c95a41e82c20aa5273b29c028))
* add blob market records page ([#237](https://github.com/douvy/blob-flow/issues/237)) ([2d07401](https://github.com/douvy/blob-flow/commit/2d0740176e7bb03df3eb93235f7099284ea4efc8))
* add blob transaction pages and put the network in the URL ([#244](https://github.com/douvy/blob-flow/issues/244)) ([ecc3875](https://github.com/douvy/blob-flow/commit/ecc3875bf01cce3d580e90e757c15cb43b23da29))
* add flippening watch tracking blob share crossovers between rollups ([#260](https://github.com/douvy/blob-flow/issues/260)) ([d9933a6](https://github.com/douvy/blob-flow/commit/d9933a65b6d4be76d2c436abb102d1fa93751c56))
* add full-screen TV mode at /live ([#243](https://github.com/douvy/blob-flow/issues/243)) ([7e17a9e](https://github.com/douvy/blob-flow/commit/7e17a9e6beb78ff0930dd394a23bd2f65759f97f))
* add rollup head-to-head battle page at /vs/[a]/[b] ([#259](https://github.com/douvy/blob-flow/issues/259)) ([525ac35](https://github.com/douvy/blob-flow/commit/525ac35068a6148a3cf528ab89aa7de2e2955a54))
* copy charts as images and share them on X ([#258](https://github.com/douvy/blob-flow/issues/258)) ([af7abff](https://github.com/douvy/blob-flow/commit/af7abffa32c2fb3294bd1e43269cf2edc3277ca3))
* dynamic Open Graph images with live blob stats ([#236](https://github.com/douvy/blob-flow/issues/236)) ([e9a7692](https://github.com/douvy/blob-flow/commit/e9a769269335913e39b4ba01aa82054da2cefc8c))
* strengthen SEO metadata, default share card, and sitemap coverage ([#264](https://github.com/douvy/blob-flow/issues/264)) ([0e6e82b](https://github.com/douvy/blob-flow/commit/0e6e82b12fdc684d7317854d9fa2b3d05ce71d57))
* sync chart time range to a shareable URL query param ([#240](https://github.com/douvy/blob-flow/issues/240)) ([5ed2269](https://github.com/douvy/blob-flow/commit/5ed2269faacc19f439a6b74e65d5676171a51cbd))


### Bug Fixes

* address pre-release review findings across share cards and time range ([#269](https://github.com/douvy/blob-flow/issues/269)) ([456f756](https://github.com/douvy/blob-flow/commit/456f756fc51cb0d703859239bba613a634f6af40))
* keep dark entity logos legible on the dark theme ([#263](https://github.com/douvy/blob-flow/issues/263)) ([6f45acf](https://github.com/douvy/blob-flow/commit/6f45acf8881d2563ade76ac8896dbd6c8850a26c))
* let touch users read the records leaderboard caveat ([#266](https://github.com/douvy/blob-flow/issues/266)) ([51bab71](https://github.com/douvy/blob-flow/commit/51bab71859cddd73fbf4b6600badc474cd44cfd9))
* **mempool:** show a pending transaction's real blob count ([#265](https://github.com/douvy/blob-flow/issues/265)) ([f9cb3ac](https://github.com/douvy/blob-flow/commit/f9cb3ac25567c7866e14955d77500d4d72bd952a))
* refuse junk query params on the chart and stat card OG routes ([#267](https://github.com/douvy/blob-flow/issues/267)) ([cac9604](https://github.com/douvy/blob-flow/commit/cac9604b321c8394e974c6beea5f394e4400c521))
* serve the vs battle pages under /[network] ([#268](https://github.com/douvy/blob-flow/issues/268)) ([ecb9ce3](https://github.com/douvy/blob-flow/commit/ecb9ce3a20d1a89a93e2fed3db5444a9efcf1bbf))


### Dependencies

* **deps:** bump next from 16.2.10 to 16.2.12 ([#245](https://github.com/douvy/blob-flow/issues/245)) ([a85a0a9](https://github.com/douvy/blob-flow/commit/a85a0a97733ce3b3a92612a2374aab1a7f400567))
* **deps:** bump recharts from 3.9.2 to 3.10.1 ([#248](https://github.com/douvy/blob-flow/issues/248)) ([abe2a59](https://github.com/douvy/blob-flow/commit/abe2a590c2f019e18338e8a23fd53a535872c017))

## [1.8.0](https://github.com/douvy/blob-flow/compare/v1.7.2...v1.8.0) (2026-08-05)


### Features

* add a blob share chart showing each network's percentage of blobspace ([#242](https://github.com/douvy/blob-flow/issues/242)) ([541962b](https://github.com/douvy/blob-flow/commit/541962b6c990685776834005713193d1c7e17b50))
* add a status page link to the footer ([#255](https://github.com/douvy/blob-flow/issues/255)) ([f9b4b9c](https://github.com/douvy/blob-flow/commit/f9b4b9cb934017c7e951dcb4cfe9e9ef5a697cb7))
* translate blob metrics into relatable units on the dashboard ([#235](https://github.com/douvy/blob-flow/issues/235)) ([83012fc](https://github.com/douvy/blob-flow/commit/83012fc87979ba46bf23f42adfdf626682aaf9e1))


### Bug Fixes

* align the % of Total bars in the top users table ([#234](https://github.com/douvy/blob-flow/issues/234)) ([7a487cc](https://github.com/douvy/blob-flow/commit/7a487ccb541906ad6b232209c6a03b1171f44a41))
* point the default API base URL at api.blobflow.com ([#254](https://github.com/douvy/blob-flow/issues/254)) ([87bbea8](https://github.com/douvy/blob-flow/commit/87bbea82ba549573df19d4ec97bb0ae648d11088))


### Dependencies

* **deps-dev:** bump @testing-library/jest-dom from 6.9.1 to 7.0.0 ([#247](https://github.com/douvy/blob-flow/issues/247)) ([2792981](https://github.com/douvy/blob-flow/commit/279298182cba3b123cc99f7b641c06469b9baa35))
* **deps-dev:** bump postcss from 8.5.23 to 8.5.25 ([#249](https://github.com/douvy/blob-flow/issues/249)) ([78dd2ab](https://github.com/douvy/blob-flow/commit/78dd2ab4632be62d9faa6908bb267c3d5fb13d2d))
* **deps:** bump @tanstack/react-query from 5.101.2 to 5.101.4 ([#246](https://github.com/douvy/blob-flow/issues/246)) ([be8040a](https://github.com/douvy/blob-flow/commit/be8040a212896dcd0573e1280ea3b6f8de20599d))
* **deps:** bump @types/node from 26.1.1 to 26.1.2 ([#250](https://github.com/douvy/blob-flow/issues/250)) ([cecf956](https://github.com/douvy/blob-flow/commit/cecf95680853220042dd9d6f32dfdc2fc7f30c49))
* **deps:** bump lucide-react from 1.27.0 to 1.28.0 ([#251](https://github.com/douvy/blob-flow/issues/251)) ([6e53f25](https://github.com/douvy/blob-flow/commit/6e53f257cab54615d67be3353c4a50dcb0289e57))
* **deps:** bump react-dom and @types/react-dom ([#253](https://github.com/douvy/blob-flow/issues/253)) ([4ffe4dd](https://github.com/douvy/blob-flow/commit/4ffe4dd2691cb750356d8db9f37f24c5b0ab0b1a))

## [1.7.2](https://github.com/douvy/blob-flow/compare/v1.7.1...v1.7.2) (2026-08-02)


### Bug Fixes

* backfill blob details for blocks past the first page ([#231](https://github.com/douvy/blob-flow/issues/231)) ([24b8c71](https://github.com/douvy/blob-flow/commit/24b8c71f6c70bf0a1e7bb179f8efec06f792cd35))
* keep raw blob archive status visible when the archive is degraded ([#230](https://github.com/douvy/blob-flow/issues/230)) ([51708f2](https://github.com/douvy/blob-flow/commit/51708f2e77bb1ed42d1ffb89fc6bf84cc2b8ed37))
* mark unknown-sender placeholder icons with the testnet ribbon ([#228](https://github.com/douvy/blob-flow/issues/228)) ([9cc0906](https://github.com/douvy/blob-flow/commit/9cc0906b7b88ec0ca44f8f0cfe7ee0e098109ef5))
* page the blob feed so every block in the pricing window gets blob data ([#232](https://github.com/douvy/blob-flow/issues/232)) ([988fc2b](https://github.com/douvy/blob-flow/commit/988fc2b611552fefdcc6d734e37181403fe27327))
* page the raw blob feed so charts get the blobs they request ([#233](https://github.com/douvy/blob-flow/issues/233)) ([347c2ce](https://github.com/douvy/blob-flow/commit/347c2ce4e7932be677a5b6ecc46bb364b907ee5a))

## [1.7.1](https://github.com/douvy/blob-flow/compare/v1.7.0...v1.7.1) (2026-08-02)


### Bug Fixes

* clarify the raw blob archive pending state ([#223](https://github.com/douvy/blob-flow/issues/223)) ([6fd4487](https://github.com/douvy/blob-flow/commit/6fd448749ebb9a23c92b9012b8ae1a41b62df81d))
* derive pending blob counts from the live mempool list ([#226](https://github.com/douvy/blob-flow/issues/226)) ([8a369ad](https://github.com/douvy/blob-flow/commit/8a369ad362073307a70f0b2dbcc00ee00282a8a6))
* measure FLIP row positions relative to the tbody ([#221](https://github.com/douvy/blob-flow/issues/221)) ([eea528d](https://github.com/douvy/blob-flow/commit/eea528d2eaec4d60b0ccd53e1372fe15daae7211))
* overlay the testnet network name on entity icons ([#227](https://github.com/douvy/blob-flow/issues/227)) ([026e1b7](https://github.com/douvy/blob-flow/commit/026e1b7c5208978486aab8b2af448e262194560f))
* show a friendly empty state for users with no activity on the selected network ([#225](https://github.com/douvy/blob-flow/issues/225)) ([c78ba50](https://github.com/douvy/blob-flow/commit/c78ba500756d4d906ea7e4597a8adc704f010369))
* show the average savings chip with two decimal places ([#224](https://github.com/douvy/blob-flow/issues/224)) ([bb0828b](https://github.com/douvy/blob-flow/commit/bb0828b85f4785d3b2273b01f661e116d518862b))


### Dependencies

* **deps:** bump actions/setup-node from 6 to 7 ([#205](https://github.com/douvy/blob-flow/issues/205)) ([a27e5d0](https://github.com/douvy/blob-flow/commit/a27e5d030d8ec4b016f950ff46416a72cb9012d1))

## [1.7.0](https://github.com/douvy/blob-flow/compare/v1.6.1...v1.7.0) (2026-08-02)


### Features

* add raw blob viewing and downloads backed by BlobArchive ([#219](https://github.com/douvy/blob-flow/issues/219)) ([84de05e](https://github.com/douvy/blob-flow/commit/84de05ed8d8d8387b949a50ba1db72e5f31ddf0a))
* source entity logos from the blob-list registry ([#218](https://github.com/douvy/blob-flow/issues/218)) ([519877f](https://github.com/douvy/blob-flow/commit/519877f68cb6258e63ceb9bde5f9d2b4763ab114))

## [1.6.1](https://github.com/douvy/blob-flow/compare/v1.6.0...v1.6.1) (2026-08-02)


### Bug Fixes

* add themed 404 page with blob mascot ([#217](https://github.com/douvy/blob-flow/issues/217)) ([673f1b6](https://github.com/douvy/blob-flow/commit/673f1b67dac8de8711ffc75132b3946e94520b55))
* keep blob user icons and names intact on mobile ([#214](https://github.com/douvy/blob-flow/issues/214)) ([df433cf](https://github.com/douvy/blob-flow/commit/df433cfd4efeeaaaa84aa2bdea83bc2f48be7fcc))
* scope the Top User card to the selected time filter ([#216](https://github.com/douvy/blob-flow/issues/216)) ([1e9c82d](https://github.com/douvy/blob-flow/commit/1e9c82d4a33be11b325dac99577d689319b7abb4))


### Dependencies

* **deps-dev:** bump @tailwindcss/postcss from 4.3.2 to 4.3.3 ([#203](https://github.com/douvy/blob-flow/issues/203)) ([7796cc0](https://github.com/douvy/blob-flow/commit/7796cc027d3770272731390d3ce0681d45b8bd13))
* **deps-dev:** bump jsdom from 29.1.1 to 30.0.1 ([#206](https://github.com/douvy/blob-flow/issues/206)) ([43c79d6](https://github.com/douvy/blob-flow/commit/43c79d604436189b5bf4b92acacc8e14770af898))
* **deps-dev:** bump postcss from 8.5.19 to 8.5.23 ([#209](https://github.com/douvy/blob-flow/issues/209)) ([9677898](https://github.com/douvy/blob-flow/commit/9677898033990f081e639f82d3a82c46c23ff92d))
* **deps:** bump @radix-ui/react-dialog from 1.1.19 to 1.1.23 ([#208](https://github.com/douvy/blob-flow/issues/208)) ([bcabe35](https://github.com/douvy/blob-flow/commit/bcabe351e720b489e974b9d51e6db69d11e490b4))
* **deps:** bump @radix-ui/react-select from 2.3.3 to 2.3.7 ([#212](https://github.com/douvy/blob-flow/issues/212)) ([44c6e1e](https://github.com/douvy/blob-flow/commit/44c6e1e57dc6be49398fbffae1a90498bcf91859))
* **deps:** bump @radix-ui/react-tooltip from 1.2.12 to 1.2.16 ([#211](https://github.com/douvy/blob-flow/issues/211)) ([4fe9364](https://github.com/douvy/blob-flow/commit/4fe9364d22ba5a33e5d5c814f02ba5ef45eeb9b0))
* **deps:** bump lucide-react from 1.24.0 to 1.27.0 ([#210](https://github.com/douvy/blob-flow/issues/210)) ([93ba09f](https://github.com/douvy/blob-flow/commit/93ba09fc4ee00741573442a78159857cc3917989))
* **deps:** bump viem from 2.55.1 to 2.55.10 ([#213](https://github.com/douvy/blob-flow/issues/213)) ([0aa40ec](https://github.com/douvy/blob-flow/commit/0aa40ecf044d8da65902275482843e776b47907e))

## [1.6.0](https://github.com/douvy/blob-flow/compare/v1.5.0...v1.6.0) (2026-07-15)


### Features

* **charts:** make Blob Usage a time series and rename from L2 Usage ([#194](https://github.com/douvy/blob-flow/issues/194)) ([e252abb](https://github.com/douvy/blob-flow/commit/e252abb1b72884049fa073463ea9503ef8966967))


### Bug Fixes

* **mempool:** derive stat cards from the live list so cards match tables ([#196](https://github.com/douvy/blob-flow/issues/196)) ([f31eb82](https://github.com/douvy/blob-flow/commit/f31eb824664c40a41221a5f2fa253385cbfff1d9))


### Dependencies

* **deps-dev:** bump postcss from 8.5.18 to 8.5.19 ([#192](https://github.com/douvy/blob-flow/issues/192)) ([e74c38a](https://github.com/douvy/blob-flow/commit/e74c38a99994bd8dbd8bc3f68723f8e1943d3c1a))
* **deps:** bump @radix-ui/react-dialog from 1.1.15 to 1.1.19 ([#191](https://github.com/douvy/blob-flow/issues/191)) ([c5394b1](https://github.com/douvy/blob-flow/commit/c5394b152ef03f38c02d6e0aea0c6c2ce7eec2e7))
* **deps:** bump @types/node from 25.9.1 to 26.1.1 ([#193](https://github.com/douvy/blob-flow/issues/193)) ([01f50f7](https://github.com/douvy/blob-flow/commit/01f50f7772d5e81030de2ec4cad39a020b7e8e06))

## [1.5.0](https://github.com/douvy/blob-flow/compare/v1.4.0...v1.5.0) (2026-07-13)


### Features

* **charts:** remove the All time range option ([#189](https://github.com/douvy/blob-flow/issues/189)) ([3952c98](https://github.com/douvy/blob-flow/commit/3952c9814209253fd08526bb74c959fa96701403))
* **hero:** full-width fullness strip and average-in-tooltip fee chart ([#187](https://github.com/douvy/blob-flow/issues/187)) ([b32a42b](https://github.com/douvy/blob-flow/commit/b32a42b48d99e4d5cb959b85ecdfd905a2aaa6ac))
* **networks:** load network list dynamically from GET /networks ([#186](https://github.com/douvy/blob-flow/issues/186)) ([75341cf](https://github.com/douvy/blob-flow/commit/75341cf353696e0a445f735ccdf34d7d357396e8))


### Bug Fixes

* **fees:** render runaway blob base fees in scientific notation ([#190](https://github.com/douvy/blob-flow/issues/190)) ([e851ae0](https://github.com/douvy/blob-flow/commit/e851ae0200674cc50b3c9f049b9b4842846fe337))

## [1.4.0](https://github.com/douvy/blob-flow/compare/v1.3.0...v1.4.0) (2026-07-13)


### Features

* **charts:** isolate series on legend click instead of hiding it ([#181](https://github.com/douvy/blob-flow/issues/181)) ([d29d418](https://github.com/douvy/blob-flow/commit/d29d418fde2aec598898bc9e7fd9abc5c9576fd3))
* link Latest Block metric card to the blocks page ([#180](https://github.com/douvy/blob-flow/issues/180)) ([c5cfdec](https://github.com/douvy/blob-flow/commit/c5cfdecfbf949e7462049f8910c7e136caf1a1a6))
* link Pending Blobs live metric to the mempool page ([#179](https://github.com/douvy/blob-flow/issues/179)) ([526017f](https://github.com/douvy/blob-flow/commit/526017f781a641c5ff176522393a8e335375a81d))
* link unattributed users to a prefilled blob-list attribution PR ([#178](https://github.com/douvy/blob-flow/issues/178)) ([1dc6e88](https://github.com/douvy/blob-flow/commit/1dc6e884293893eb241707ca515ea85b6aebfd32))


### Bug Fixes

* **charts:** prevent axis and label clipping and improve tooltip contrast ([#183](https://github.com/douvy/blob-flow/issues/183)) ([84bb6c3](https://github.com/douvy/blob-flow/commit/84bb6c328e08a5c2be9be01a6718c03d13b852ed))
* keep pending blob figures consistent across the homepage ([#184](https://github.com/douvy/blob-flow/issues/184)) ([945f0ad](https://github.com/douvy/blob-flow/commit/945f0ad15f48c8eb26c90655a003b2637316284a))
* show chart bucket labels and block timestamps in local time ([#182](https://github.com/douvy/blob-flow/issues/182)) ([94297ce](https://github.com/douvy/blob-flow/commit/94297cee3443a3c3b278934b8385fcd83be9521c))
* show precise per-blob cost instead of "&lt;0.000001 ETH" placeholder ([#177](https://github.com/douvy/blob-flow/issues/177)) ([4357787](https://github.com/douvy/blob-flow/commit/435778707efcee9a3384c68dcaa481860a97d5bc))
* tidy version tag in footer meta line ([#175](https://github.com/douvy/blob-flow/issues/175)) ([1d42da4](https://github.com/douvy/blob-flow/commit/1d42da4abad2492dc2ac435d1ce1bf29997def06))

## [1.3.0](https://github.com/douvy/blob-flow/compare/v1.2.0...v1.3.0) (2026-07-13)


### Features

* collapse pending blobs into a summary at top of user page ([#174](https://github.com/douvy/blob-flow/issues/174)) ([2bbd0bc](https://github.com/douvy/blob-flow/commit/2bbd0bc1d4be121f1b4e04f5af73722fca283358))
* display frontend version in footer ([#154](https://github.com/douvy/blob-flow/issues/154)) ([bbaffbb](https://github.com/douvy/blob-flow/commit/bbaffbbdf6e77954c7063aff7e1245764be46863))
* filter chart series by clicking the legend ([#157](https://github.com/douvy/blob-flow/issues/157)) ([b01a09d](https://github.com/douvy/blob-flow/commit/b01a09d927fc82090193c84afc6b45a0e507149f))
* link mempool senders to their user page ([#173](https://github.com/douvy/blob-flow/issues/173)) ([d56be27](https://github.com/douvy/blob-flow/commit/d56be27f93e98931b4e718c047e0b05d1da3d7eb))


### Bug Fixes

* let global staleTime default apply to useApiData queries ([#172](https://github.com/douvy/blob-flow/issues/172)) ([ed884b2](https://github.com/douvy/blob-flow/commit/ed884b2f16bf876d41e1d66cd230f5c2b39fd7a1))
* render user total cost as human readable ETH ([#171](https://github.com/douvy/blob-flow/issues/171)) ([0c69bc6](https://github.com/douvy/blob-flow/commit/0c69bc64ddfed459c6fdfba8e65c984d622b0c89))
* stop false "indexer is behind" banner after tab is backgrounded ([#170](https://github.com/douvy/blob-flow/issues/170)) ([ad071b5](https://github.com/douvy/blob-flow/commit/ad071b5a7233a68af699f436cb49db29f84b8877))


### Dependencies

* **deps-dev:** bump @tailwindcss/postcss from 4.3.0 to 4.3.2 ([#168](https://github.com/douvy/blob-flow/issues/168)) ([3468f57](https://github.com/douvy/blob-flow/commit/3468f57ba09ac1051a7d346a07e6be86559bfd10))
* **deps-dev:** bump vitest from 4.1.8 to 4.1.10 ([#159](https://github.com/douvy/blob-flow/issues/159)) ([1a153c6](https://github.com/douvy/blob-flow/commit/1a153c6e44ededd80eab6a256dbac93e1a87e4d3))
* **deps:** bump @radix-ui/react-select from 2.2.6 to 2.3.3 ([#163](https://github.com/douvy/blob-flow/issues/163)) ([37146c8](https://github.com/douvy/blob-flow/commit/37146c8d570e05256a32c39640e0a4a99d988196))
* **deps:** bump @radix-ui/react-tooltip from 1.2.11 to 1.2.12 ([#162](https://github.com/douvy/blob-flow/issues/162)) ([f5521e2](https://github.com/douvy/blob-flow/commit/f5521e21aeafe672d6adea61b070c63901955670))
* **deps:** bump @tanstack/react-query from 5.100.14 to 5.101.2 ([#164](https://github.com/douvy/blob-flow/issues/164)) ([a7a9dbb](https://github.com/douvy/blob-flow/commit/a7a9dbb59cbad2d012a997e5fab058a19b92473b))
* **deps:** bump eslint-config-next from 16.2.7 to 16.2.10 ([#161](https://github.com/douvy/blob-flow/issues/161)) ([cb53370](https://github.com/douvy/blob-flow/commit/cb533701eb110cac98804fc7013e8ce5338578dd))
* **deps:** bump lucide-react from 1.23.0 to 1.24.0 ([#169](https://github.com/douvy/blob-flow/issues/169)) ([266ec0e](https://github.com/douvy/blob-flow/commit/266ec0ebb50c30321cb0bb1685de035859b9e2fa))
* **deps:** bump viem from 2.52.0 to 2.55.1 ([#165](https://github.com/douvy/blob-flow/issues/165)) ([5a4662f](https://github.com/douvy/blob-flow/commit/5a4662fa4ddbd64d9b5cf06219c1d9df779d40a9))

## [1.2.0](https://github.com/douvy/blob-flow/compare/v1.1.0...v1.2.0) (2026-07-13)


### Features

* **mempool:** explain fee cap headroom with a hover tooltip ([#152](https://github.com/douvy/blob-flow/issues/152)) ([bc5d034](https://github.com/douvy/blob-flow/commit/bc5d034a9f8494c2c4a80730fad0c9754a374817))


### Bug Fixes

* clarify blob capacity display ([#89](https://github.com/douvy/blob-flow/issues/89)) ([ee3a9b2](https://github.com/douvy/blob-flow/commit/ee3a9b2a5fae3a40c224b6b693b188db431006bb))

## [1.1.0](https://github.com/douvy/blob-flow/compare/v1.0.0...v1.1.0) (2026-07-13)


### Features

* add blob fee market visualizations with real API data ([84e9d1f](https://github.com/douvy/blob-flow/commit/84e9d1fbc6debb4f81c91c593d70aaf608a5d880))
* add blob fee market visualizations with real API data ([c5cc0f2](https://github.com/douvy/blob-flow/commit/c5cc0f219e61ba58ada66ed82afc911a295b5c15))
* add blob pricing and pressure panels ([9e1637d](https://github.com/douvy/blob-flow/commit/9e1637d1b9874cebc05d3ec57eed441ee3d58c0b))
* add blob pricing and pressure panels ([9e03e12](https://github.com/douvy/blob-flow/commit/9e03e125a6bc2c3091ccddfa4314137980199160))
* add enlarged chart views ([b0ab691](https://github.com/douvy/blob-flow/commit/b0ab6914306c33aef5775e46218c13de2efa27a1))
* add enlarged chart views ([0c1e61e](https://github.com/douvy/blob-flow/commit/0c1e61e0db7027f3d68247ff5815d695ef27e224))
* add frontend UX libraries ([0ac4da8](https://github.com/douvy/blob-flow/commit/0ac4da8cf4c5d97cf8cc4c433c9fce66cc46a7a6))
* add frontend UX libraries ([26999b7](https://github.com/douvy/blob-flow/commit/26999b75292995c94bb87d23f28da986e72926ae))
* add mempool blob details modal ([631dc29](https://github.com/douvy/blob-flow/commit/631dc2992743ea4bbbb1def3b2499869e4816abf))
* add mempool blob details modal ([65e1bec](https://github.com/douvy/blob-flow/commit/65e1bec924f575a0dde17b34bea5cb5eb6f4f1fb))
* add websocket live data layer ([0d03773](https://github.com/douvy/blob-flow/commit/0d03773608447b4e090ee81f234a9c7e3f6f856a))
* add websocket live data layer ([64afbaf](https://github.com/douvy/blob-flow/commit/64afbaf1d2641a98b62a64819fa801ce22420e67))
* align frontend with refactored backend API ([31a72d2](https://github.com/douvy/blob-flow/commit/31a72d265bf08541bdec26870dd08d0102c6a1ec))
* align frontend with refactored backend API ([7657cf7](https://github.com/douvy/blob-flow/commit/7657cf7843d4116067dcf7b4265521b352f1b732))
* animate row updates in live tables ([b6ecbf4](https://github.com/douvy/blob-flow/commit/b6ecbf434089532cbf1b824f9401dc90a3556079))
* animate row updates in live tables ([03e4a46](https://github.com/douvy/blob-flow/commit/03e4a46105ac9d5024a366ae6546a7e40497f2bd))
* **blocks:** add block detail page with Etherscan link ([94ec8ae](https://github.com/douvy/blob-flow/commit/94ec8ae27ed7065af75ff8baf4c240c7f39d85d7))
* **blocks:** add block detail page with Etherscan link ([06e7569](https://github.com/douvy/blob-flow/commit/06e75698e9137e005b8d2c1cfd551077f4602fff))
* compact Recent Block Fees + /blocks page with pagination ([d050ece](https://github.com/douvy/blob-flow/commit/d050eceffbf5110c28c02c0259cacd62612c2899))
* compact Recent Block Fees + /blocks page with pagination ([8b0eeea](https://github.com/douvy/blob-flow/commit/8b0eeea198e46c3f793741f7f38d1b1b694889e0))
* dedicated user detail page with blob tables ([2120087](https://github.com/douvy/blob-flow/commit/212008770e8de4cc074ee2376cc99848cdc8e308))
* emphasize real-time blob analytics for SEO and UX ([#115](https://github.com/douvy/blob-flow/issues/115)) ([a7b40ef](https://github.com/douvy/blob-flow/commit/a7b40ef20b4df8e63f7bc28bd0bc3a31835b2a59))
* enrich blob and mempool tables ([3c87c74](https://github.com/douvy/blob-flow/commit/3c87c74daaf4e7845a0912b6e81d01833235ff65))
* enrich blob table fields ([0fee1b9](https://github.com/douvy/blob-flow/commit/0fee1b938e5c96ec151ea84aa979ec872764f712))
* **header:** add 1h option to time range filter ([660283b](https://github.com/douvy/blob-flow/commit/660283b06ffb3c41992582160e282883d26f61bf))
* **header:** add 1h option to time range filter ([dcdb046](https://github.com/douvy/blob-flow/commit/dcdb046eab860a500efd34d5565f45eab99c882f))
* **hero:** show a full hour of blocks in the 1h live view ([#130](https://github.com/douvy/blob-flow/issues/130)) ([f2b4e8e](https://github.com/douvy/blob-flow/commit/f2b4e8ef99f8968df09979b46a69e72ede9be804))
* implement live data ([3f711b2](https://github.com/douvy/blob-flow/commit/3f711b2df4f9398327130a8cedf8d1f50b7ee6ea))
* implement live data ([d91943e](https://github.com/douvy/blob-flow/commit/d91943e20db86273fac493f3a09d603ca8209b71))
* live-pulse metrics row at top of dashboard ([65f5484](https://github.com/douvy/blob-flow/commit/65f5484ccfbc503ee49de3f933ea2f86595810e4))
* live-pulse metrics row at top of dashboard ([e9ff69b](https://github.com/douvy/blob-flow/commit/e9ff69b097759042421e51b6a0e6514ca20b5f3a))
* make the hero Above target stat follow the time range filter ([09117ed](https://github.com/douvy/blob-flow/commit/09117ed5d9f9bb3c1c915d95ef583bf57979a220))
* make the hero Above target stat follow the time range filter ([95b4f5a](https://github.com/douvy/blob-flow/commit/95b4f5add9daa9a1943674c4b33e6a1d81f5a360))
* **mempool:** add block explorer links to pending blob details modal ([#135](https://github.com/douvy/blob-flow/issues/135)) ([37ebe45](https://github.com/douvy/blob-flow/commit/37ebe45383957fd99b6523c832329f30cf4ea547))
* **mempool:** replace homepage attribution table with summary line and dedicated page ([#119](https://github.com/douvy/blob-flow/issues/119)) ([078e74b](https://github.com/douvy/blob-flow/commit/078e74b27efef4cf5341caa87dd67ccaaf095124))
* plumb in network selector ([bfa9d8a](https://github.com/douvy/blob-flow/commit/bfa9d8a516ea32add496543b7b21a073aa8a7d11))
* plumb in network selector ([a79443c](https://github.com/douvy/blob-flow/commit/a79443c3310a717effbd11809c8442e0e75a2e82))
* prioritize latest blob market data ([27a94bb](https://github.com/douvy/blob-flow/commit/27a94bba5058bee2ed6ba95eb9933268b2961479))
* prioritize latest blob market data ([9dfdfcf](https://github.com/douvy/blob-flow/commit/9dfdfcf26ef032b1fa9f2bfbcb1b0dc53dce8a4e))
* redesign front page around a live blob fee hero ([590583c](https://github.com/douvy/blob-flow/commit/590583c4fa5bbdbe78db7df48c1c19650e090e35))
* redesign front page around a live blob fee hero ([4d782fc](https://github.com/douvy/blob-flow/commit/4d782fc5f0a12c18ca53083ea318b07695af34c3))
* replace placeholder charts with live blob data ([0ea1e84](https://github.com/douvy/blob-flow/commit/0ea1e8407201690b2e7fda56cbbca6ef84c77220))
* replace placeholder charts with live blob data ([fe6156d](https://github.com/douvy/blob-flow/commit/fe6156dec616fc691f14b697668b6f7708b5bfbf))
* replace user detail modal with dedicated /user/[address] page ([cc568da](https://github.com/douvy/blob-flow/commit/cc568daaa92fd6dac749f224d5352d4b72f253c8))
* **search:** remove latest blob activity and blob stats summary ([#137](https://github.com/douvy/blob-flow/issues/137)) ([7dbb366](https://github.com/douvy/blob-flow/commit/7dbb366354263eb35dac7e8fd02b4eda7421f76d))
* **search:** working search — navigation, type-ahead, and new indexer endpoints ([#113](https://github.com/douvy/blob-flow/issues/113)) ([9bddf7a](https://github.com/douvy/blob-flow/commit/9bddf7a0ea3dc19e36b2837f4c815f8d260fe9be))
* show blob details for blocks ([0d8f8da](https://github.com/douvy/blob-flow/commit/0d8f8dac000cbbc4e6564b86524366d80c02e867))
* show blob details for blocks ([efe2f75](https://github.com/douvy/blob-flow/commit/efe2f75944d7a4e4c91544ed264b16caf6b04712))
* show blob gas max capacity line ([1b09c2f](https://github.com/douvy/blob-flow/commit/1b09c2fc03de6788cb77ecc65aea3349d58704fa))
* show indexer health banner when backend lags or backfills ([#118](https://github.com/douvy/blob-flow/issues/118)) ([d9c4196](https://github.com/douvy/blob-flow/commit/d9c4196b5cfc1c6c8ba77357114d437598772ddd))
* **ui:** add primary navigation for Home, Blocks, and Mempool ([#123](https://github.com/douvy/blob-flow/issues/123)) ([fe5e499](https://github.com/douvy/blob-flow/commit/fe5e499e76d213ebfab0a2f1a4e0bd6fc8e6ca86))
* **ui:** show header time filters only on the home page ([#127](https://github.com/douvy/blob-flow/issues/127)) ([096a0e1](https://github.com/douvy/blob-flow/commit/096a0e18cb1fbfd53f914851b9875a219f64846c))
* **ui:** tick relative timestamps every second ([fa26ec8](https://github.com/douvy/blob-flow/commit/fa26ec80a12e578700c1d7dbb56505fcdb7ad7e9))
* **ui:** tick relative timestamps every second ([abbbb7a](https://github.com/douvy/blob-flow/commit/abbbb7a7370656a4ddad1e5770f849b7588bbc82))
* **users:** filter top blob users by selected time range ([#129](https://github.com/douvy/blob-flow/issues/129)) ([c193db9](https://github.com/douvy/blob-flow/commit/c193db96bdeb85feb784a7013744237c6efd27b5))
* **users:** show the selected timeframe on the Top Blob Users table ([#134](https://github.com/douvy/blob-flow/issues/134)) ([4b355d5](https://github.com/douvy/blob-flow/commit/4b355d58cdc81828cd2fa53e2742e2ae9c8d9c56))
* wire chart endpoints ([93ce197](https://github.com/douvy/blob-flow/commit/93ce1972d090217e45b5820e391fc43f00be2b7e))
* wire chart endpoints ([ed5d373](https://github.com/douvy/blob-flow/commit/ed5d3732bc11efd8644013fd7be4a9ce90cbb2b6))


### Bug Fixes

* address blob market review feedback ([4f8cd26](https://github.com/douvy/blob-flow/commit/4f8cd269c756c11d22c21ece1a5c773e98246ccc))
* address blob market review feedback ([52d5c92](https://github.com/douvy/blob-flow/commit/52d5c92b9e403e641803c37ec2c78253f23a0b69))
* address blob table review feedback ([6ab58e6](https://github.com/douvy/blob-flow/commit/6ab58e6cb91861fbb04f9a0318642d4dc1b25207))
* address chart data review ([628b4d7](https://github.com/douvy/blob-flow/commit/628b4d791e483a8ac05fd07880dd1f1dd109144d))
* address hero above-target review comments ([40848dd](https://github.com/douvy/blob-flow/commit/40848dd004eeb618415660712c1ad1c7807cf7c1))
* address LiveMetrics review feedback ([ecca860](https://github.com/douvy/blob-flow/commit/ecca8602c960083cd9196a3cdeed232b500200e7))
* address rolling stats review feedback ([40878ca](https://github.com/douvy/blob-flow/commit/40878cad8461ca11d7dc86da310fe4b932a16aab))
* address websocket review feedback ([4c3106c](https://github.com/douvy/blob-flow/commit/4c3106c35847566a205f2cde549f06016282885b))
* align hero trend labels with header ranges ([#104](https://github.com/douvy/blob-flow/issues/104)) ([c9dcdf7](https://github.com/douvy/blob-flow/commit/c9dcdf7dd25108007f2a520d1291a210e90efb8d))
* align recent block usage indicators ([60851b9](https://github.com/douvy/blob-flow/commit/60851b95f6637fdcb985d603b9664995dba512cf))
* align recent block usage indicators ([6c5f7ce](https://github.com/douvy/blob-flow/commit/6c5f7ce786c435ec108179f3a67888d999b989d2))
* avoid deduping customized GET requests ([dc9daa2](https://github.com/douvy/blob-flow/commit/dc9daa226af7a867b802c279b6e013edf4030c90))
* avoid empty attribution image srcs ([6228e05](https://github.com/douvy/blob-flow/commit/6228e052992f97ef9868eead86cc958f4810df77))
* **banner:** report overall blob history coverage during backfill ([#133](https://github.com/douvy/blob-flow/issues/133)) ([9c7701d](https://github.com/douvy/blob-flow/commit/9c7701dc593344dd878ff945aaae4fb638dfccae))
* **blocks:** honor explicit collapse and stop row toggle on link keypress ([156c004](https://github.com/douvy/blob-flow/commit/156c0044e2ef4faaf29043fd3532a42084013ef6))
* **blocks:** keep the blocks page current by accumulating live ws blocks ([#128](https://github.com/douvy/blob-flow/issues/128)) ([eb09678](https://github.com/douvy/blob-flow/commit/eb09678a1edeaceb6e08a492e789a1b6e163064b))
* **blocks:** show dash instead of Unknown for zero-blob blocks ([#126](https://github.com/douvy/blob-flow/issues/126)) ([a0bc9ff](https://github.com/douvy/blob-flow/commit/a0bc9ffd959fed8424480b065e51a3c47beca69c))
* **blocks:** start Recent Block Fees with no row expanded ([929f20a](https://github.com/douvy/blob-flow/commit/929f20a5be01808599fcdc090529ae6fa46ec2fe))
* **blocks:** start Recent Block Fees with no row expanded ([f3bfbdc](https://github.com/douvy/blob-flow/commit/f3bfbdc9b64dfc08d7a1326336d3a051f8563043))
* **charts:** caption each chart view with the bucket count it plots ([#139](https://github.com/douvy/blob-flow/issues/139)) ([6dcdddb](https://github.com/douvy/blob-flow/commit/6dcdddbf99a0a52be5c6d2c3a89caf2f026deba3))
* **charts:** describe actual indexed coverage while the indexer backfills ([#141](https://github.com/douvy/blob-flow/issues/141)) ([e7e9ed3](https://github.com/douvy/blob-flow/commit/e7e9ed342c36374b4f9749d2a4d2cea7edeea155))
* **charts:** drop empty buckets from L2 usage and cost comparison charts ([#138](https://github.com/douvy/blob-flow/issues/138)) ([7e91308](https://github.com/douvy/blob-flow/commit/7e91308f66414f4326f1dcbdec6b470fac6205d4))
* **charts:** drop empty market buckets instead of plotting zero fees ([#136](https://github.com/douvy/blob-flow/issues/136)) ([1e931fe](https://github.com/douvy/blob-flow/commit/1e931fe193230fc23d751b14602cd3d87d4b3e5c))
* clarify blob fee trend range ([1fe77d1](https://github.com/douvy/blob-flow/commit/1fe77d170f9893b4cfef5f860150293043daf2cb))
* clarify blob fee trend range ([6055693](https://github.com/douvy/blob-flow/commit/605569352b4a6435d4ee0ca8ae80f9e462cebe51))
* disable react-hooks/set-state-in-effect for existing hydration patterns ([1607750](https://github.com/douvy/blob-flow/commit/160775097ce8aaff2f3ce80b62ff843fd75d024c))
* **flip-rows:** gate on row signature and finish prior animations ([9a05dd0](https://github.com/douvy/blob-flow/commit/9a05dd0d3855572b3cdffcbfd3b0f46686023faa))
* format average total cost from wei ([97dc625](https://github.com/douvy/blob-flow/commit/97dc6250dfe33da6bf76247efb79ee7f17bc7817))
* format average total cost from wei ([2d6d1bf](https://github.com/douvy/blob-flow/commit/2d6d1bf34530451007af6a8349d33a75b973450b))
* include period in avg base fee panel ([7892f6e](https://github.com/douvy/blob-flow/commit/7892f6e5eacf89b67f1bb0f4d8aec241e13b4a1d))
* include period in avg base fee panel ([897dd92](https://github.com/douvy/blob-flow/commit/897dd92470981b90e34c1ae0e25afd568640f78f))
* link Recent Block Fees rows to block detail page ([#109](https://github.com/douvy/blob-flow/issues/109)) ([d7e8fd3](https://github.com/douvy/blob-flow/commit/d7e8fd35583bb53bde90ac9540e1d1f1dcc5212f))
* **mempool:** stop horizontal scrolling in Mempool Attribution table ([#114](https://github.com/douvy/blob-flow/issues/114)) ([6d26131](https://github.com/douvy/blob-flow/commit/6d261316632ff2ca76194a5d5c002387485728f4))
* migrate to ESLint flat config for Next.js 16 compatibility ([1da2249](https://github.com/douvy/blob-flow/commit/1da2249e3bcf9bcd70cb73de3db1062b9f5908ba))
* populate recent block fees from websocket ([fd8dfc6](https://github.com/douvy/blob-flow/commit/fd8dfc62d3d3f3a6e5ce335aaa1ecd0cb30f6480))
* populate recent block fees from websocket ([84e8f14](https://github.com/douvy/blob-flow/commit/84e8f1492e1760ab503faf5d9f115c614952b650))
* prevent blocks row auto-expand ([d2aa8a9](https://github.com/douvy/blob-flow/commit/d2aa8a924ec46235e2cb7f07cc7eb1516bb21dea))
* prevent blocks row auto-expand ([369df7f](https://github.com/douvy/blob-flow/commit/369df7febee81a09dd5255018d9a08a5b525cfa8))
* pulse websocket status on activity ([26374cb](https://github.com/douvy/blob-flow/commit/26374cb6f755a373bb314acfaa0bb01f5326613e))
* pulse websocket status on activity ([ed5637d](https://github.com/douvy/blob-flow/commit/ed5637dc735c6d4a86a31f2d7a0ec2946f35e3c2))
* reduce duplicate dashboard backend requests ([3ae85f8](https://github.com/douvy/blob-flow/commit/3ae85f84deedea05a794646462ac565d089ecb65))
* reduce duplicate dashboard backend requests ([f0974a2](https://github.com/douvy/blob-flow/commit/f0974a24bd80ede2adc358836880f37d2b154665))
* regenerate lockfile for npm ci compatibility ([02e985e](https://github.com/douvy/blob-flow/commit/02e985e1ba8ca98d836f2cbe6759a4ce33dc4688))
* remove stale dependencies arg from all useApiData callers ([c5a990d](https://github.com/douvy/blob-flow/commit/c5a990d4cd0677ead85dfce718aaac5ac4702988))
* remove unused dependencies param from useApiData hooks ([d975c37](https://github.com/douvy/blob-flow/commit/d975c377b3f0145f5c04abcd272e1b1659fa5eb8))
* remove unused useState import from useNetwork ([3651640](https://github.com/douvy/blob-flow/commit/3651640b84218d87ce48d9a5b975f87b74b0e81f))
* remove unused variable to pass lint ([3788719](https://github.com/douvy/blob-flow/commit/378871975285d1dbd6a4bafb8fd68bc4be52882b))
* replace font awesome icons ([232c6d3](https://github.com/douvy/blob-flow/commit/232c6d3f0c09007faced9630540971efc47987de))
* replace raw attribution img tags ([2fb1327](https://github.com/douvy/blob-flow/commit/2fb132703f7b5fe55f87448017297df3ebf2965b))
* replace raw attribution img tags ([f847b82](https://github.com/douvy/blob-flow/commit/f847b82c368b427a2c1698c874daf2498af95c9b))
* replace remaining font awesome icons ([cd0d24e](https://github.com/douvy/blob-flow/commit/cd0d24e41fa99d15950fc25716f85961f5b3358e))
* replace setState-in-effect patterns for react-hooks@7 compatibility ([c4beb16](https://github.com/douvy/blob-flow/commit/c4beb16f9f3b7ae61489e64607ccd8dbc9da48da))
* restore recent block expand chevrons ([3250972](https://github.com/douvy/blob-flow/commit/32509721ef82091f3e2c67254aac06e8ee6d1d69))
* restore recent block expand chevrons ([e0a4577](https://github.com/douvy/blob-flow/commit/e0a4577e5eda82a75612677776105862f7ce7ab7))
* **search:** keep the clicked search type highlighted in the search modal ([#140](https://github.com/douvy/blob-flow/issues/140)) ([26cc482](https://github.com/douvy/blob-flow/commit/26cc482c7f51d74528be1be1b531ef26d932d24a))
* show chart fullscreen icons ([5ec08c0](https://github.com/douvy/blob-flow/commit/5ec08c00701bf8b23159259c273ddf282ad33470))
* show top user metric ([3b914eb](https://github.com/douvy/blob-flow/commit/3b914eb5c9fa2cf5ff8f6b064af3aa66c932ff45))
* show top user metric ([c0555f1](https://github.com/douvy/blob-flow/commit/c0555f1b128f0a7742a101c20001940548c346b5))
* smooth table row animations ([d4fbf75](https://github.com/douvy/blob-flow/commit/d4fbf75146b1a3409ca1db56f30c1251ae6c7c39))
* smooth table row animations ([722c129](https://github.com/douvy/blob-flow/commit/722c12941827966cee436d797ff6947ae8fb3144))
* stabilize top users table data ([f8fc2e1](https://github.com/douvy/blob-flow/commit/f8fc2e137a5a4886ebb9d3737bf8a622ba77878b))
* stabilize top users table data ([7a9256f](https://github.com/douvy/blob-flow/commit/7a9256f7303f4533da597d69ee424512cb6ce95f))
* stop repeated live API fetches ([c95b6fc](https://github.com/douvy/blob-flow/commit/c95b6fc1ba2e9aaf6727a7bb55a1de7b274d9225))
* stop repeated live API fetches ([d53a547](https://github.com/douvy/blob-flow/commit/d53a547a3d8e799f8fce538d58c2e3ff0dc12b71))
* stop search modal from thrashing event listeners on every websocket tick ([f86724b](https://github.com/douvy/blob-flow/commit/f86724b640e09995c61192051f66f151a0ddb502))
* stop search modal from thrashing listeners on websocket activity ([84f036b](https://github.com/douvy/blob-flow/commit/84f036b924dc9932b2fbd4340140cf502b70618f))
* sync hero strip with selected range ([8029721](https://github.com/douvy/blob-flow/commit/8029721c1f24cc3dec760df4ac3075302b65f902))
* **ui:** hide backfill banner when the indexer is nearly caught up ([#120](https://github.com/douvy/blob-flow/issues/120)) ([7485a5f](https://github.com/douvy/blob-flow/commit/7485a5f84cb31f9069526874ef3af7ad65cc40c1))
* **ui:** merge hero strip buckets so long ranges don't overflow the card ([#116](https://github.com/douvy/blob-flow/issues/116)) ([d3c3b89](https://github.com/douvy/blob-flow/commit/d3c3b894287460094a749dfcc78ea32b79f0028e))
* **ui:** remove chevron from Recent Block Fees rows ([#111](https://github.com/douvy/blob-flow/issues/111)) ([217c7f3](https://github.com/douvy/blob-flow/commit/217c7f3bde1dfb41c876e398ef6fe6eb1b9551e6))
* update lint script and eslint-config-next for Next.js 16 compatibility ([ad93882](https://github.com/douvy/blob-flow/commit/ad938829fdbe35c8cecdedcb32e0d1f58094eeb1))
* use rolling market stats for charts ([27cd2c1](https://github.com/douvy/blob-flow/commit/27cd2c1b14128c1a27c65e19665dcb0d3f347239))
* use rolling market stats for charts ([f9e00b3](https://github.com/douvy/blob-flow/commit/f9e00b33977744c26a3754fe4080e7d9196c6cd6))
* use tailwind rotation for recent block chevron ([3949458](https://github.com/douvy/blob-flow/commit/39494584815838e29ce9a91b90c9e0ee8d739f3b))
* wire time filters to charts ([cb37f3b](https://github.com/douvy/blob-flow/commit/cb37f3b9800965f316fe4795d2cb3c6c11651884))
* wire time filters to charts ([c9b0824](https://github.com/douvy/blob-flow/commit/c9b0824c6e9c4b5c098862270f4a7933fa77bb04))
* **ws:** stop missing block updates — reconnect stale sockets, consume block_snapshot, refetch on reconnect ([#110](https://github.com/douvy/blob-flow/issues/110)) ([fd11ad1](https://github.com/douvy/blob-flow/commit/fd11ad1d66611107d51c239e2c36537e49340029))


### Performance Improvements

* scope live-event re-renders to consumers of the changed event type ([33aa0fc](https://github.com/douvy/blob-flow/commit/33aa0fc5c206ab8452ede946319963b227283afb))
* stop re-rendering all WebSocket consumers on every message ([cc6d6d5](https://github.com/douvy/blob-flow/commit/cc6d6d5d824b7dc59ef534ede782782d7abf7fc0))
* stop re-rendering all WebSocket consumers on every message ([26e077c](https://github.com/douvy/blob-flow/commit/26e077cea6ce458b496a4f646f8c669ad18e0404))
