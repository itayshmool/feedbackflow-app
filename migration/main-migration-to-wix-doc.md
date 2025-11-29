# Goal
Migrate this app - server and frontend, to wix infra.

# How to plan
1. learn the structure of this app components: services, apis, data modeling (DB), user models, and fronend.
2. learn the tech stack of each components
3. learn about wix infra - server and client
4. in wix infra, leraning from refrences & docs is the high-way. keep it simple, with the same patterns.
5. try not to use generate command, just copy-and-update from example config file (like bazel, package json, etc)
6. kepp all docs in migration folder. we are going to work on multi-rep (for server and for client, and this repo that need to be migrate) - when needed, notify me and we open the context in the relevant repo

## Server
Wix server infra includes out-of-the-box crud, in Java. This called Ninja - "nile on java" - where nile is the infra based on scala.
** HERE WE ARE GOING TO CREATE WIX NINJA - JAVA SERVICES **

- based on bazel, in java
- loop prime is the server bootstrap
- sdl is the infra for db, we are getting in out of the box. super easy!
- this app will contain pii data - so we need it here!!!
- think about data modeling and tenant that should be

Docs & Refrences:
ninja onboarding - including basic crud, data and pii -
/Users/nissano/wix-academy/server-onboarding/guides/rendered/java/stp
(stp == something to prod guide. from step 3 this is becomaing impoetant)

Examples:
subscription-change-product - java service, with crud: /Users/nissano/premium/premium-server/premium-subscriptions-product-change
premium-invoices - java service with crud and kafka: /Users/nissano/premium-billing/premium-invoices

Where to?
all server apps will be in new directory here in the wix-academy repo [/Users/nissano/wix-academy]


## Frontend
- BO app wix wix-serverless (node-js) to render the app, only for wix employes, under vpn, for wix users only.
- the serverless render react app (yoshi-library)

Docs & Refrences:
wix-serverless infra:
https://dev.wix.com/docs/server-guild/serverless/serverless/expose-http-endpoint

Examples:
- server rendere tempalte of react app: 
server: /Users/nissano/premium-purchase-platform/serverless/p3-serve
react app: /Users/nissano/premium-purchase-platform/packages/p3-backoffice

use the same design patterns & style from this react app
- premium-fed-sdk for the code pattern, api calls, erorr handling, modals
- same handling forms & validations
- ambassador for api calls
- same ux/ui style and templates for this app, with wix-design-system components (https://www.docs.wixdesignsystem.com/?path=/story/getting-started--about)

Where to?
generate new monorepo for this, with the same stracture like the premium-purchase-platform repo (package for static/library and serverless direcorites).

# How to & Where to start
- first, plan main doc, and docs for server/client. i want to have main index for this plan.
- use skills:
1. for any step, re-activate the brainstorming skill and then plan skill
2. exexute skill with tdd aproach when u can.
3. for frontend degin - use
- top-down design & implematation - start to brainstorm and plan server side. only when we finish server main apis, we will move to serverless & react app.
- the goal is to have "wiring" working: api calls properly. if the infra will work (server<>fronend comuniucate) we can go on.
- in services - think about which data (domains) each service going to serve -> but keep it simple!
- do not forget tests.
- for more refrences, you can use octocode mcp in wix-private org.
- users - we have user and auth in Wix, out-of-the-box. We just need the hirerachy in terms 
- migraiton plan (scrips/bluck api) for migrate the data

super important: plan migration for each component, in steps. in each step, fully investigate the wix tools in high level. have a main plan doc, with index and directories for plan server and client. inside there, migration plan  for each service and api.

---

# Migration Plan Index

## Design Document
- [Migration Design (2025-11-29)](./design/2025-11-29-migration-design.md) - Overall architecture and decisions

## Server Plans
- [Core Service Plan](./server/core-service-plan.md) - Users, Organizations, Hierarchy, Roles (Phase 1)
- [Feedback Service Plan](./server/feedback-service-plan.md) - Cycles, Feedback, Templates (Phase 2)
- [Operations Service Plan](./server/ops-service-plan.md) - Notifications, Analytics, Audit (Phase 4)

## Client Plans
- [Frontend Plan](./client/frontend-plan.md) - React BO app with wix-serverless (Phase 3)

## Execution Order
1. **Phase 1**: Core Service (feedbackflow-core) - Foundation service
2. **Phase 2**: Feedback Service (feedbackflow-feedback) - Main business logic
3. **Phase 3**: Frontend (feedbackflow-bo) - React app + wix-serverless
4. **Phase 4**: Operations Service (feedbackflow-ops) + Data Migration