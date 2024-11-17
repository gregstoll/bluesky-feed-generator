import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { External, isExternal } from './lexicon/types/app/bsky/embed/external'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    /*for (const post of ops.posts.creates) {
      console.log("TEXT: " + post.record.text);
      console.log("by author " + post.author);
    }*/

    // TODO look at ops.reposts too
    // see https://github.com/dolciss/rp-next-post/blob/main/src/subscription.ts

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // only posts with links
        // TODO look at things it's quoting 
        return isExternal(create.record.embed?.external);
        //return create.record.text.toLowerCase().includes('alf')
      })
      .map((create) => {
        // map posts to a db row
        console.log("TEXT with embed: " + create.record.text);
        console.log("by author " + create.author);
        console.log("uri " + create.uri);
        return {
          uri: create.uri,
          cid: create.cid,
          author: create.author,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
