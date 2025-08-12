// types/next.d.ts
import type { Server as HTTPServer } from "http";
import type { Socket } from "net";
import type { Server as IOServer } from "socket.io";

declare module "next" {
  import type { NextApiResponse } from "next";

  export type NextApiResponseServerIO = NextApiResponse & {
    socket: Socket & {
      server: HTTPServer & {
        io: IOServer;
      };
    };
  };
}
