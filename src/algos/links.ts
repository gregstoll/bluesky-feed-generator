import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

// max 15 chars
export const shortname = 'links'

export const handler = async (ctx: AppContext, params: QueryParams, requesterDid: string) => {
  let userRecord = await ctx.db.selectFrom('user')
    .selectAll()
    .where('did', '==', requesterDid)
    .executeTakeFirst();
  let needToRefreshUser = !userRecord;
  let followedDids : string[] = [];
  if (userRecord) {
    let now = new Date();
    let lastUpdated = new Date(userRecord.indexedAt);
    const intervalInHours = (now.valueOf() - lastUpdated.valueOf()) / (1000 * 60 * 60);
    if (intervalInHours >= 6) {
      needToRefreshUser = true;
    } else {
      followedDids = userRecord.followedDids.split(',')
    }
  }
  if (needToRefreshUser) {
    // TODO - paginate
    let response = await ctx.agent.app.bsky.graph.getFollows({actor: requesterDid, limit: 100})
    let newDids : string[] = response.follows.map(f => f.did);
    followedDids.push(...newDids);
    // TODO - update db
  }

  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit)

  builder = builder.where('author', 'in', followedDids)
  if (params.cursor) {
    const [indexedAt, cid] = params.cursor.split('::')
    if (!indexedAt || !cid) {
      throw new InvalidRequestError('malformed cursor')
    }
    const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
    builder = builder
      .where('post.indexedAt', '<', timeStr)
      .orWhere((qb) => qb.where('post.indexedAt', '=', timeStr))
      .where('post.cid', '<', cid)
  }
  const res = await builder.execute()

  const feed = res.map((row) => ({
    post: row.uri,
  }))

  let cursor: string | undefined
  const last = res.at(-1)
  if (last) {
    cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
  }

  return {
    cursor,
    feed,
  }
}
