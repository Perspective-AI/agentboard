import { redirect } from "next/navigation";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  redirect(`/boards/${boardId}/projects`);
}
