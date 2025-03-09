export interface AppConfig {
  port: number;
  nodeEnv: string;
}

export interface StarkNetConfig {
  providerUrl: string;
  network: string;
}

export interface DatabaseConfig {
  uri: string;
  name: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface Config {
  app: AppConfig;
  starknet: StarkNetConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
}
