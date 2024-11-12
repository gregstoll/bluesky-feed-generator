import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as links from './links'

type AlgoHandler = (ctx: AppContext, params: QueryParams, requesterDid: string) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [links.shortname]: links.handler,
}

export default algos
