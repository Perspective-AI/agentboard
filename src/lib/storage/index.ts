import type {
  ActivityEvent,
  Agent,
  Board,
  BoardSummary,
  Initiative,
  Plan,
  PlanStep,
  Project,
  Task,
} from "@/lib/types";

export interface Storage {
  // Boards
  createBoard(data: Pick<Board, "name" | "description">): Promise<Board>;
  listBoards(): Promise<Board[]>;
  getBoard(boardId: string): Promise<Board | null>;
  getBoardSummary(boardId: string): Promise<BoardSummary | null>;
  updateBoard(boardId: string, data: Partial<Pick<Board, "name" | "description">>): Promise<Board | null>;
  deleteBoard(boardId: string): Promise<boolean>;

  // Agents
  createAgent(boardId: string, data: Pick<Agent, "name" | "description" | "metadata">): Promise<Agent>;
  listAgents(boardId: string): Promise<Agent[]>;
  getAgent(boardId: string, agentId: string): Promise<Agent | null>;
  updateAgent(
    boardId: string,
    agentId: string,
    data: Partial<Pick<Agent, "name" | "description" | "status" | "statusMessage" | "currentTaskId" | "currentInitiativeId" | "metadata">>,
  ): Promise<Agent | null>;
  deleteAgent(boardId: string, agentId: string): Promise<boolean>;
  heartbeatAgent(boardId: string, agentId: string, message?: string): Promise<Agent | null>;

  // Projects
  createProject(boardId: string, data: Pick<Project, "name" | "description">): Promise<Project>;
  listProjects(boardId: string): Promise<Project[]>;
  getProject(boardId: string, projectId: string): Promise<Project | null>;
  updateProject(boardId: string, projectId: string, data: Partial<Pick<Project, "name" | "description">>): Promise<Project | null>;
  deleteProject(boardId: string, projectId: string): Promise<boolean>;

  // Initiatives
  createInitiative(
    boardId: string,
    data: Pick<Initiative, "name" | "description"> & Partial<Pick<Initiative, "status" | "kind" | "assigneeAgentIds">>,
  ): Promise<Initiative>;
  listInitiatives(boardId: string): Promise<Initiative[]>;
  getInitiative(boardId: string, initiativeId: string): Promise<Initiative | null>;
  updateInitiative(
    boardId: string,
    initiativeId: string,
    data: Partial<Pick<Initiative, "name" | "description" | "status" | "kind" | "assigneeAgentIds">>,
  ): Promise<Initiative | null>;
  deleteInitiative(boardId: string, initiativeId: string): Promise<boolean>;

  // Plans
  createPlan(
    boardId: string,
    initiativeId: string,
    data: Pick<Plan, "title" | "description"> &
      Partial<Pick<Plan, "status" | "ownerAgentId" | "tags">>,
  ): Promise<Plan>;
  listPlans(boardId: string, initiativeId: string): Promise<Plan[]>;
  getPlan(boardId: string, initiativeId: string, planId: string): Promise<Plan | null>;
  updatePlan(
    boardId: string,
    initiativeId: string,
    planId: string,
    data: Partial<Pick<Plan, "title" | "description" | "status" | "ownerAgentId" | "tags">>,
  ): Promise<Plan | null>;
  deletePlan(boardId: string, initiativeId: string, planId: string): Promise<boolean>;

  // Plan steps
  createPlanStep(
    boardId: string,
    initiativeId: string,
    planId: string,
    data: Pick<PlanStep, "title" | "description"> &
      Partial<Pick<PlanStep, "status" | "assigneeAgentId" | "order">>,
  ): Promise<PlanStep>;
  listPlanSteps(boardId: string, initiativeId: string, planId: string): Promise<PlanStep[]>;
  getPlanStep(boardId: string, initiativeId: string, planId: string, stepId: string): Promise<PlanStep | null>;
  updatePlanStep(
    boardId: string,
    initiativeId: string,
    planId: string,
    stepId: string,
    data: Partial<Pick<PlanStep, "title" | "description" | "status" | "assigneeAgentId" | "order">>,
  ): Promise<PlanStep | null>;
  deletePlanStep(boardId: string, initiativeId: string, planId: string, stepId: string): Promise<boolean>;

  // Tasks
  createTask(
    boardId: string,
    initiativeId: string,
    data: Pick<Task, "title" | "description" | "assigneeAgentId" | "priority" | "tags"> &
      Partial<Pick<Task, "planId" | "planStepId" | "assigneeAgentIds" | "deliverables">>,
    actorAgentId: string,
  ): Promise<Task>;
  listTasks(boardId: string, initiativeId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]>;
  listAllBoardTasks(boardId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]>;
  getTask(boardId: string, initiativeId: string, taskId: string): Promise<Task | null>;
  updateTask(
    boardId: string,
    initiativeId: string,
    taskId: string,
    data: Partial<
      Pick<
        Task,
        "title" | "description" | "status" | "planId" | "planStepId" | "assigneeAgentId" | "assigneeAgentIds" | "deliverables" | "priority" | "tags"
      >
    >,
    actorAgentId: string,
  ): Promise<Task | null>;
  deleteTask(boardId: string, initiativeId: string, taskId: string, actorAgentId: string): Promise<boolean>;

  // Activity
  listActivity(boardId: string, options?: { limit?: number; initiativeId?: string; agentId?: string; taskId?: string }): Promise<ActivityEvent[]>;
}
