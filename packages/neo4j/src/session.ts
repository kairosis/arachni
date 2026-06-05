import { Driver, Session } from 'neo4j-driver';

export async function withSession<T>(
  driver: Driver,
  database: string,
  fn: (session: Session) => Promise<T>,
): Promise<T> {
  const session = driver.session({ database });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}
