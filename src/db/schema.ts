export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  user: User
}

export type Post = {
  uri: string
  cid: string
  author: string
  indexedAt: string
}

export type User = {
  did: string
  // Comma separated
  followedDids: string
  indexedAt: string
}

export type SubState = {
  service: string
  cursor: number
}
