declare module 'next' {
  export interface NextApiRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    body: any;
    query: Record<string, any>;
  }

  export interface NextApiResponse<T = any> {
    status: (statusCode: number) => NextApiResponse<T>;
    json: (body: T) => NextApiResponse<T>;
  }
}
