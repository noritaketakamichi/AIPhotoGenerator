// Configuration types and validation
interface Config {
  env: {
    NODE_ENV: string;
    // Add other environment variables here as needed
  };
}

export const config: Config = {
  env: {
    NODE_ENV: import.meta.env.NODE_ENV || 'development',
  }
};
