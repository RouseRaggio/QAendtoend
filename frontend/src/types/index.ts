export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  key: string;
  description?: string;
  version: string;
  status: string;
  created_at: string;
  modules_count: number;
  test_cases_count: number;
  user_stories_count?: number;
}

export interface Module {
  id: number;
  project_id: number;
  name: string;
  description?: string;
}

export interface TestCase {
  id: number;
  project_id: number;
  module_id?: number;
  module_name?: string;
  code: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps: string[];
  expected_result: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  tags: string[];
  is_ai_generated: boolean;
  is_archived?: boolean;
  user_story_id?: number;
  user_story_code?: string;
  user_story_title?: string;
  last_result?: string;
  created_at: string;
}

export interface PaginatedTestCases {
  items: TestCase[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ImportPreviewItem {
  row_number: number;
  code: string;
  title: string;
  module_name?: string;
  description?: string;
  preconditions?: string;
  steps: string[];
  expected_result: string;
  priority: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  message: string;
  exists_in_db: boolean;
}

export interface ImportPreviewResponse {
  filename: string;
  total_rows: number;
  valid_count: number;
  warning_count: number;
  error_count: number;
  items: ImportPreviewItem[];
}

export interface ImportCommitResponse {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: any[];
  total_associated_cases?: number;
}

export interface Evidence {
  id: number;
  test_result_id: number;
  bug_id?: number;
  improvement_id?: number;
  file_name: string;
  content_type: string;
  file_size: number;
  file_path: string;
  description?: string;
  display_order: number;
  uploaded_at: string;
}

export interface TestResult {
  id: number;
  execution_id: number;
  test_case_id: number;
  test_case_code?: string;
  test_case_title?: string;
  module_name?: string;
  order_index?: number;
  status: 'PASSED' | 'BUG' | 'IMPROVEMENT' | 'BLOCKED' | 'NOT_EXECUTED' | 'IN_PROGRESS';
  expected_result?: string;
  actual_result?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  observations?: string;
  executed_by_name?: string;
  started_at?: string;
  completed_at?: string;
  executed_at?: string;
  evidences: Evidence[];
  bug_id?: number;
  improvement_id?: number;
}

export interface Execution {
  id: number;
  project_id: number;
  project_name?: string;
  name: string;
  description?: string;
  version: string;
  environment: string;
  status: string;
  total_cases: number;
  executed_count: number;
  passed_count: number;
  bugs_count: number;
  improvements_count: number;
  blocked_count: number;
  pending_count: number;
  in_progress_count: number;
  progress_percentage: number;
  responsible_name?: string;
  user_story_ids?: number[];
  user_story_codes?: string[];
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface ExecutionCaseItem {
  id: number;
  execution_id: number;
  test_case_id: number;
  order_index: number;
  code: string;
  title: string;
  module_name?: string;
  user_story_id?: number;
  user_story_code?: string;
  user_story_title?: string;
  description?: string;
  preconditions?: string;
  steps: string[];
  expected_result: string;
  priority: string;
  status: 'PASSED' | 'BUG' | 'IMPROVEMENT' | 'BLOCKED' | 'NOT_EXECUTED' | 'IN_PROGRESS';
  actual_result?: string;
  severity: string;
  observations?: string;
  started_at?: string;
  completed_at?: string;
  executed_at?: string;
  evidences: Evidence[];
  bug_id?: number;
  improvement_id?: number;
}

export interface ExecutionDetail {
  id: number;
  project_id: number;
  project_name?: string;
  name: string;
  description?: string;
  version: string;
  environment: string;
  status: string;
  responsible_name?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  total_cases: number;
  passed_count: number;
  bugs_count: number;
  improvements_count: number;
  blocked_count: number;
  pending_count: number;
  in_progress_count: number;
  executed_count: number;
  progress_percentage: number;
  user_story_ids?: number[];
  user_story_codes?: string[];
  user_stories?: Array<{ id: number; code: string; title: string; status: string }>;
  cases: ExecutionCaseItem[];
}

export interface Bug {
  id: number;
  code: string;
  title: string;
  description?: string;
  project_id: number;
  project_name?: string;
  module_name?: string;
  test_case_id?: number;
  test_case_code?: string;
  test_result_id?: number;
  execution_id?: number;
  steps_to_reproduce?: string;
  severity: string;
  priority: string;
  status: string;
  assignee_name?: string;
  created_at: string;
  evidences: Evidence[];
}

export interface Improvement {
  id: number;
  code: string;
  title: string;
  description?: string;
  project_id: number;
  module_name?: string;
  test_case_code?: string;
  test_result_id?: number;
  priority: string;
  status: string;
  created_at: string;
  evidences: Evidence[];
}

export interface DashboardMetrics {
  active_project_id: number;
  active_project_name: string;
  active_execution_id?: number;
  active_execution_name?: string;
  total_test_cases: number;
  executed_tests: number;
  passed: number;
  bugs: number;
  improvements: number;
  blocked: number;
  not_executed: number;
  execution_progress_pct: number;
  pass_pct: number;
  bug_pct: number;
  improvement_pct: number;
  recent_results: TestResult[];
  open_bugs_count: number;
  high_severity_bugs_count: number;
  pending_improvements_count: number;
  resolved_count: number;
}

export interface AIGeneratedCase {
  temp_code?: string;
  title: string;
  test_type: 'POSITIVE' | 'NEGATIVE' | 'VALIDATION' | 'BOUNDARY' | 'SECURITY' | 'INTEGRATION';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  preconditions: string;
  steps: string[];
  expected_result: string;
  traceability: string[];
}

export interface AIGenerateResponse {
  user_story_id: number;
  analysis: {
    requirements: string[];
    business_rules: string[];
    roles: string[];
    risks: string[];
    ambiguities: string[];
  };
  test_cases: AIGeneratedCase[];
}


export interface UserStory {
  id: number;
  project_id: number;
  project_name?: string;
  module_id?: number;
  module_name?: string;
  code: string;
  title: string;
  description?: string;
  story_text?: string;
  status: string;
  assignee_id?: number;
  assignee_name?: string;
  jira_key?: string;
  acceptance_criteria: string[];
  business_rules?: string;
  test_cases_count?: number;
  latest_execution_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserStoryDetail extends UserStory {
  test_cases: TestCase[];
  executions: Array<{
    id: number;
    name: string;
    version: string;
    environment: string;
    status: string;
    started_at?: string;
    ended_at?: string;
    total_cases: number;
    passed_count: number;
    bugs_count: number;
  }>;
  metrics: {
    total_cases: number;
    passed: number;
    failed: number;
    blocked: number;
    pending: number;
    pass_rate: number;
    coverage_percentage: number;
  };
}
