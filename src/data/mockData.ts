export interface Repository {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  description: string;
  language: string;
  framework: string;
  visibility: 'public' | 'private';
  updatedAt: string;
  files: number;
  lines: number;
  symbols: number;
  languages: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceRef[];
  timestamp: number;
}

export interface SourceRef {
  file: string;
  lines: string;
  snippet?: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
}

export interface ArchNode {
  id: string;
  name: string;
  type: 'screen' | 'provider' | 'service' | 'model' | 'api' | 'storage';
  x: number;
  y: number;
}

export interface ArchEdge {
  from: string;
  to: string;
}

export interface ImpactRef {
  file: string;
  line: number;
  type: 'direct' | 'indirect';
}

export const kamaoFileTree: FileNode = {
  name: 'kamao',
  type: 'folder',
  children: [
    {
      name: 'lib',
      type: 'folder',
      children: [
        {
          name: 'components',
          type: 'folder',
          children: [
            { name: 'app_button.dart', type: 'file', language: 'dart' },
            { name: 'app_card.dart', type: 'file', language: 'dart' },
            { name: 'app_text_field.dart', type: 'file', language: 'dart' },
            { name: 'loading_indicator.dart', type: 'file', language: 'dart' },
            { name: 'profile_avatar.dart', type: 'file', language: 'dart' },
          ],
        },
        {
          name: 'models',
          type: 'folder',
          children: [
            { name: 'user_model.dart', type: 'file', language: 'dart' },
            { name: 'job_model.dart', type: 'file', language: 'dart' },
            { name: 'application_model.dart', type: 'file', language: 'dart' },
            { name: 'notification_model.dart', type: 'file', language: 'dart' },
          ],
        },
        {
          name: 'providers',
          type: 'folder',
          children: [
            { name: 'auth_provider.dart', type: 'file', language: 'dart' },
            { name: 'profile_provider.dart', type: 'file', language: 'dart' },
            { name: 'job_provider.dart', type: 'file', language: 'dart' },
            { name: 'theme_provider.dart', type: 'file', language: 'dart' },
          ],
        },
        {
          name: 'screens',
          type: 'folder',
          children: [
            {
              name: 'auth',
              type: 'folder',
              children: [
                { name: 'login_screen.dart', type: 'file', language: 'dart' },
                { name: 'register_screen.dart', type: 'file', language: 'dart' },
                { name: 'splash_screen.dart', type: 'file', language: 'dart' },
              ],
            },
            {
              name: 'home',
              type: 'folder',
              children: [
                { name: 'home_screen.dart', type: 'file', language: 'dart' },
                { name: 'dashboard_screen.dart', type: 'file', language: 'dart' },
              ],
            },
            {
              name: 'profile',
              type: 'folder',
              children: [
                { name: 'profile_screen.dart', type: 'file', language: 'dart' },
                { name: 'settings_screen.dart', type: 'file', language: 'dart' },
              ],
            },
            {
              name: 'jobs',
              type: 'folder',
              children: [
                { name: 'job_list_screen.dart', type: 'file', language: 'dart' },
                { name: 'job_detail_screen.dart', type: 'file', language: 'dart' },
                { name: 'application_screen.dart', type: 'file', language: 'dart' },
              ],
            },
          ],
        },
        {
          name: 'services',
          type: 'folder',
          children: [
            { name: 'auth_service.dart', type: 'file', language: 'dart' },
            { name: 'api_service.dart', type: 'file', language: 'dart' },
            { name: 'storage_service.dart', type: 'file', language: 'dart' },
            { name: 'notification_service.dart', type: 'file', language: 'dart' },
          ],
        },
        {
          name: 'utils',
          type: 'folder',
          children: [
            { name: 'constants.dart', type: 'file', language: 'dart' },
            { name: 'validators.dart', type: 'file', language: 'dart' },
            { name: 'formatters.dart', type: 'file', language: 'dart' },
          ],
        },
        { name: 'main.dart', type: 'file', language: 'dart' },
        { name: 'app.dart', type: 'file', language: 'dart' },
      ],
    },
    {
      name: 'test',
      type: 'folder',
      children: [
        { name: 'auth_service_test.dart', type: 'file', language: 'dart' },
        { name: 'user_model_test.dart', type: 'file', language: 'dart' },
      ],
    },
    { name: 'pubspec.yaml', type: 'file', language: 'yaml' },
    { name: 'analysis_options.yaml', type: 'file', language: 'yaml' },
    { name: 'README.md', type: 'file', language: 'markdown' },
  ],
};

export const authServiceCode = `class AuthService {
  final ApiService _api;
  final StorageService _storage;
  
  AuthService(this._api, this._storage);

  Future<User?> login(String email, String password) async {
    try {
      final response = await _api.post('/auth/login', body: {
        'email': email,
        'password': password,
      });

      if (response.success) {
        final user = User.fromJson(response.data);
        await _storage.saveSession(response.token);
        await _storage.saveUser(user);
        return user;
      }

      return null;
    } catch (e) {
      throw AuthException('Login failed: \${e.toString()}');
    }
  }

  Future<void> logout() async {
    await _storage.clearSession();
    await _storage.clearUser();
  }

  Future<User?> getCurrentUser() async {
    final token = await _storage.getSession();
    if (token == null) return null;

    try {
      final response = await _api.get('/auth/me');
      if (response.success) {
        return User.fromJson(response.data);
      }
      return null;
    } catch (e) {
      await _storage.clearSession();
      return null;
    }
  }

  Future<bool> isAuthenticated() async {
    final user = await getCurrentUser();
    return user != null;
  }
}`;

export const archNodes: ArchNode[] = [
  { id: 'splash', name: 'SplashScreen', type: 'screen', x: 300, y: 40 },
  { id: 'login', name: 'LoginScreen', type: 'screen', x: 300, y: 140 },
  { id: 'register', name: 'RegisterScreen', type: 'screen', x: 500, y: 140 },
  { id: 'auth_provider', name: 'AuthProvider', type: 'provider', x: 300, y: 240 },
  { id: 'auth_service', name: 'AuthService', type: 'service', x: 300, y: 340 },
  { id: 'api_service', name: 'ApiService', type: 'service', x: 300, y: 440 },
  { id: 'storage', name: 'StorageService', type: 'storage', x: 500, y: 340 },
  { id: 'rest_api', name: 'REST API', type: 'api', x: 300, y: 540 },
  { id: 'home', name: 'HomeScreen', type: 'screen', x: 100, y: 340 },
  { id: 'profile', name: 'ProfileScreen', type: 'screen', x: 100, y: 440 },
  { id: 'user_model', name: 'UserModel', type: 'model', x: 500, y: 440 },
  { id: 'job_model', name: 'JobModel', type: 'model', x: 600, y: 340 },
  { id: 'job_provider', name: 'JobProvider', type: 'provider', x: 100, y: 240 },
  { id: 'job_list', name: 'JobListScreen', type: 'screen', x: 100, y: 140 },
];

export const archEdges: ArchEdge[] = [
  { from: 'splash', to: 'auth_provider' },
  { from: 'login', to: 'auth_provider' },
  { from: 'register', to: 'auth_provider' },
  { from: 'auth_provider', to: 'auth_service' },
  { from: 'auth_service', to: 'api_service' },
  { from: 'auth_service', to: 'storage' },
  { from: 'api_service', to: 'rest_api' },
  { from: 'auth_provider', to: 'home' },
  { from: 'home', to: 'profile' },
  { from: 'auth_service', to: 'user_model' },
  { from: 'job_provider', to: 'job_model' },
  { from: 'job_provider', to: 'job_list' },
  { from: 'job_provider', to: 'api_service' },
];

export const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Where is authentication handled?',
    timestamp: Date.now() - 60000,
  },
  {
    id: '2',
    role: 'assistant',
    content: `Authentication is primarily handled by **AuthService**.\n\nThe login flow starts from **LoginScreen** and passes credentials to \`AuthService.login()\`. The service communicates with **ApiService** and stores the resulting session state.\n\nThe complete flow:\n1. LoginScreen collects email and password\n2. AuthProvider calls AuthService.login()\n3. AuthService sends a POST request to /auth/login\n4. On success, the session token is stored via StorageService\n5. AuthProvider updates the app state, making HomeScreen accessible`,
    sources: [
      { file: 'auth_service.dart', lines: '24-91', snippet: 'Future<User?> login(String email, String password) async {' },
      { file: 'login_screen.dart', lines: '48-76', snippet: 'void _handleLogin() async {' },
      { file: 'auth_provider.dart', lines: '12-54', snippet: 'Future<void> login(String email, String password) async {' },
    ],
    timestamp: Date.now() - 55000,
  },
  {
    id: '3',
    role: 'user',
    content: 'What happens after login succeeds?',
    timestamp: Date.now() - 40000,
  },
  {
    id: '4',
    role: 'assistant',
    content: `After a successful login:\n\n1. **ApiService** returns the authenticated user object\n2. **AuthService** stores the session token and user data via StorageService\n3. **AuthProvider** updates application state with the new user\n4. **HomeScreen** becomes accessible and the user is navigated there\n\nThe state changes propagate through the Provider pattern, notifying all listening widgets.`,
    sources: [
      { file: 'auth_service.dart', lines: '62' },
      { file: 'auth_provider.dart', lines: '31' },
      { file: 'home_screen.dart', lines: '18' },
    ],
    timestamp: Date.now() - 35000,
  },
];

export const suggestedQuestions = [
  'Where is authentication handled?',
  'How does the login flow work?',
  'Explain the project architecture.',
  'What calls UserRepository?',
  'What happens when a user logs in?',
  'What could break if I change UserModel?',
];

export const searchResults = [
  { symbol: 'AuthService.login', file: 'auth_service.dart', line: 24, description: 'Authentication entry point', type: 'function' },
  { symbol: 'AuthService.logout', file: 'auth_service.dart', line: 50, description: 'Clears session and user data', type: 'function' },
  { symbol: 'AuthService.getCurrentUser', file: 'auth_service.dart', line: 56, description: 'Fetches authenticated user', type: 'function' },
  { symbol: 'AuthProvider.login', file: 'auth_provider.dart', line: 18, description: 'State management for login', type: 'method' },
  { symbol: 'UserModel', file: 'user_model.dart', line: 1, description: 'User data model', type: 'class' },
  { symbol: 'LoginScreen', file: 'login_screen.dart', line: 12, description: 'Login UI screen', type: 'class' },
  { symbol: 'ApiService.post', file: 'api_service.dart', line: 34, description: 'HTTP POST request handler', type: 'method' },
  { symbol: 'StorageService.saveSession', file: 'storage_service.dart', line: 15, description: 'Persists auth token', type: 'method' },
  { symbol: 'JobModel', file: 'job_model.dart', line: 1, description: 'Job listing data model', type: 'class' },
  { symbol: 'AppButton', file: 'app_button.dart', line: 8, description: 'Reusable button component', type: 'class' },
];

export const impactRefs: ImpactRef[] = [
  { file: 'auth_service.dart', line: 42, type: 'direct' },
  { file: 'profile_provider.dart', line: 18, type: 'direct' },
  { file: 'profile_screen.dart', line: 76, type: 'direct' },
  { file: 'settings_screen.dart', line: 102, type: 'indirect' },
  { file: 'home_screen.dart', line: 34, type: 'indirect' },
];
