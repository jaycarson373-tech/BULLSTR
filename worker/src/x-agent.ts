import { createHmac, randomBytes } from "node:crypto";
import { config } from "./config.js";
import { supabase } from "./db.js";

type QueuedPost = {
  id: string;
  kind: string;
  text: string;
  reply_to_tweet_id: string | null;
};

type CatAction = {
  id: string;
  epoch_id: string;
  mint: string;
  symbol: string | null;
  side: string;
  status: string;
  input_amount_raw: string;
  output_amount_raw: string;
  tx_sig: string | null;
  metadata: Record<string, unknown> | null;
};

type XTweet = {
  id: string;
  text: string;
  author_id?: string;
};

function isConfigured() {
  return Boolean(
    config.xBearerToken ||
      (config.xApiKey && config.xApiKeySecret && config.xAccessToken && config.xAccessTokenSecret)
  );
}

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function nonce() {
  return randomBytes(16).toString("hex");
}

function oauthHeader(method: string, url: URL, queryParams: Record<string, string>) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.xApiKey,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.xAccessToken,
    oauth_version: "1.0"
  };

  const params = Object.entries({ ...queryParams, ...oauthParams })
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const baseUrl = `${url.origin}${url.pathname}`;
  const baseString = [method.toUpperCase(), encode(baseUrl), encode(params)].join("&");
  const signingKey = `${encode(config.xApiKeySecret)}&${encode(config.xAccessTokenSecret)}`;
  oauthParams.oauth_signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  return `OAuth ${Object.entries(oauthParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(", ")}`;
}

function authHeader(method: string, url: URL, queryParams: Record<string, string>) {
  if (config.xBearerToken) return `Bearer ${config.xBearerToken}`;
  return oauthHeader(method, url, queryParams);
}

async function xFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    query?: Record<string, string | undefined>;
    body?: unknown;
  } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const url = new URL(`${config.xAgentApiBase}${path}`);
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, value);
    queryParams[key] = value;
  }

  const response = await fetch(url, {
    method,
    headers: {
      authorization: authHeader(method, url, queryParams),
      "content-type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`X API ${method} ${path} failed (${response.status}): ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function trimPost(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 260) return normalized;
  return `${normalized.slice(0, 257).trimEnd()}...`;
}

async function createPost(text: string, replyToTweetId?: string | null) {
  if (!config.xAgentPostEnabled) throw new Error("X_AGENT_POST_ENABLED is false");
  if (!isConfigured()) throw new Error("Missing X API credentials");

  const body: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text: trimPost(text) };
  if (replyToTweetId) body.reply = { in_reply_to_tweet_id: replyToTweetId };

  const result = await xFetch<{ data: { id: string; text: string } }>("/tweets", {
    method: "POST",
    body
  });
  return result.data;
}

async function queuedPosts(limit: number): Promise<QueuedPost[]> {
  const { data, error } = await supabase
    .from("x_post_queue")
    .select("id,kind,text,reply_to_tweet_id")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`x queue lookup: ${JSON.stringify(error)}`);
  return (data ?? []) as QueuedPost[];
}

async function updateQueuedPost(id: string, status: string, fields: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("x_post_queue")
    .update({ status, updated_at: new Date().toISOString(), ...fields })
    .eq("id", id);
  if (error) throw new Error(`x queue update: ${JSON.stringify(error)}`);
}

async function tradeActions(limit: number): Promise<CatAction[]> {
  const statuses = config.xAgentPostPlannedTrades ? ["executed", "planned"] : ["executed"];
  const { data, error } = await supabase
    .from("cat_agent_actions")
    .select("id,epoch_id,mint,symbol,side,status,input_amount_raw,output_amount_raw,tx_sig,metadata")
    .in("status", statuses)
    .is("x_post_id", null)
    .is("x_post_status", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`cat action x lookup: ${JSON.stringify(error)}`);
  return (data ?? []) as CatAction[];
}

async function markTradeActionXStatus(id: string, status: string, xPostId: string | null, errorMessage: string | null = null) {
  const { error } = await supabase
    .from("cat_agent_actions")
    .update({ x_post_id: xPostId, x_post_status: status, x_post_error: errorMessage, x_posted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`cat action x update: ${JSON.stringify(error)}`);
}

function tradeText(action: CatAction) {
  const symbol = action.symbol || "TOKEN";
  const side = action.side.toUpperCase();
  const reason = typeof action.metadata?.reason === "string" ? action.metadata.reason : "approved signal";
  const tx = action.tx_sig ? `\nTX: https://solscan.io/tx/${action.tx_sig}` : "";
  const mode = action.status === "planned" ? "plan queued" : "trade settled";
  return `${config.projectName} ${mode}.\n${side} $${symbol}\nReason: ${reason}${tx}\nThe market dog is watching the tape.`;
}

async function processQueuedPosts(limit: number) {
  let posted = 0;
  for (const post of await queuedPosts(limit)) {
    try {
      const tweet = await createPost(post.text, post.reply_to_tweet_id);
      await updateQueuedPost(post.id, "posted", { x_post_id: tweet.id });
      posted += 1;
    } catch (error) {
      await updateQueuedPost(post.id, "failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  return posted;
}

async function processTradePosts(limit: number) {
  if (!config.xAgentAutoTradePosts || limit <= 0) return 0;
  let posted = 0;
  for (const action of await tradeActions(limit)) {
    try {
      const tweet = await createPost(tradeText(action));
      await markTradeActionXStatus(action.id, "posted", tweet.id);
      posted += 1;
    } catch (error) {
      console.error(`[X] failed to post trade action ${action.id}`, error);
      await markTradeActionXStatus(action.id, "failed", null, error instanceof Error ? error.message : String(error));
    }
  }
  return posted;
}

async function getState(key: string) {
  const { data, error } = await supabase.from("x_agent_state").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`x state read: ${JSON.stringify(error)}`);
  return typeof data?.value === "string" ? data.value : "";
}

async function setState(key: string, value: string) {
  const { error } = await supabase.from("x_agent_state").upsert({
    key,
    value,
    updated_at: new Date().toISOString()
  });
  if (error) throw new Error(`x state write: ${JSON.stringify(error)}`);
}

function newestTweetId(tweets: XTweet[]) {
  return tweets.reduce((max, tweet) => {
    if (!max) return tweet.id;
    return BigInt(tweet.id) > BigInt(max) ? tweet.id : max;
  }, "");
}

function replyText(tweet: XTweet) {
  const lower = tweet.text.toLowerCase();
  if (lower.includes("treasury")) return "Inuvestor sees the treasury question. Every serious desk watches cash before chasing candles.";
  if (lower.includes("buy")) return "Inuvestor only moves from approved signals. No random paws on the wallet.";
  if (lower.includes("mission") || lower.includes("bounty")) return "Market desk missions are waking up. Bring useful work, not noise.";
  return "Inuvestor saw this. The desk is learning the room.";
}

async function processMentions(limit: number) {
  if (!config.xAgentReplyToMentions || !config.xUserId || limit <= 0) return 0;
  const sinceId = await getState("last_mention_id");
  const result = await xFetch<{ data?: XTweet[] }>(`/users/${config.xUserId}/mentions`, {
    query: {
      max_results: String(Math.max(5, Math.min(10, limit + 4))),
      since_id: sinceId || undefined,
      "tweet.fields": "author_id,created_at,conversation_id"
    }
  });
  const mentions = (result.data ?? []).filter((tweet) => tweet.author_id !== config.xUserId);
  if (result.data?.length) {
    await setState("last_mention_id", newestTweetId(result.data));
  }

  let posted = 0;
  for (const mention of mentions.slice(0, limit)) {
    try {
      const tweet = await createPost(replyText(mention), mention.id);
      const { error } = await supabase.from("x_post_queue").insert({
        kind: "mention_reply",
        text: tweet.text,
        reply_to_tweet_id: mention.id,
        status: "posted",
        x_post_id: tweet.id
      });
      if (error) throw new Error(`x mention receipt insert: ${JSON.stringify(error)}`);
      posted += 1;
    } catch (error) {
      console.error(`[X] failed to reply to mention ${mention.id}`, error);
    }
  }
  return posted;
}

export async function runXAgent() {
  if (!config.xAgentEnabled) return;
  if (!config.xAgentPostEnabled) {
    console.log("[X] X_AGENT_ENABLED=true but X_AGENT_POST_ENABLED=false; skipping posts");
    return;
  }

  let remaining = config.xAgentMaxPostsPerEpoch;
  const queued = await processQueuedPosts(remaining);
  remaining -= queued;
  const tradePosts = await processTradePosts(remaining);
  remaining -= tradePosts;
  const replies = await processMentions(remaining);
  console.log(`[X] posted=${queued + tradePosts + replies}, queued=${queued}, trades=${tradePosts}, replies=${replies}`);
}
