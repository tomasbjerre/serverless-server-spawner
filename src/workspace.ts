export interface Server {
  identity: string;
}

export class Workspace {
  constructor(private folder: string) {}

  public getOrCreate(cloneUrl: string, branch: string): Server {
    return {
      identity: 'asdassadasd',
    };
  }
}
