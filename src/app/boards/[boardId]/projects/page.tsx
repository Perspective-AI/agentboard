import { redirect } from "next/navigation";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  redirect(`/boards/${boardId}/initiatives`);
}
