import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";
import { createDocumentTagApi } from "@/lib/api/document-tag-handlers";

const api = createDocumentTagApi({
  getUser: getAuthenticatedUser,
  getService: getTagService,
});

export const GET = api.list;
