/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agentLoop from "../agentLoop.js";
import type * as chat from "../chat.js";
import type * as dashboard from "../dashboard.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as landing from "../landing.js";
import type * as memory from "../memory.js";
import type * as menu from "../menu.js";
import type * as notify from "../notify.js";
import type * as onboard from "../onboard.js";
import type * as orders from "../orders.js";
import type * as owner from "../owner.js";
import type * as ownerTools from "../ownerTools.js";
import type * as payments from "../payments.js";
import type * as shops from "../shops.js";
import type * as site from "../site.js";
import type * as storefront from "../storefront.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agentLoop: typeof agentLoop;
  chat: typeof chat;
  dashboard: typeof dashboard;
  events: typeof events;
  http: typeof http;
  items: typeof items;
  landing: typeof landing;
  memory: typeof memory;
  menu: typeof menu;
  notify: typeof notify;
  onboard: typeof onboard;
  orders: typeof orders;
  owner: typeof owner;
  ownerTools: typeof ownerTools;
  payments: typeof payments;
  shops: typeof shops;
  site: typeof site;
  storefront: typeof storefront;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
