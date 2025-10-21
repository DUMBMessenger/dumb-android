import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dumb_api_dart/dumb_api_dart.dart';
import 'package:record/record.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:file_picker/file_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:just_audio/just_audio.dart';
import 'package:mime/mime.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:dumb_android/l10n/app_localizations.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;

String apiUrl = 'http://localhost:3000';
String telemetryUrl = 'https://analytics.dumb-msg.xyz:7634';
String? _cachedToken;
final Map<String, String> _avatarCache = {};
final Battery _battery = Battery();
bool _telemetryEnabled = true;
late ChatClient _chatClient;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final themeModeString = prefs.getString('theme_mode');
  final themeMode = themeModeString == 'dark'
      ? ThemeMode.dark
      : themeModeString == 'light'
          ? ThemeMode.light
          : ThemeMode.system;
  _telemetryEnabled = prefs.getBool('telemetry_enabled') ?? true;

  runApp(DumbApp(themeMode: themeMode));
}

class DumbApp extends StatefulWidget {
  final ThemeMode themeMode;
  const DumbApp({super.key, required this.themeMode});

  @override
  State<DumbApp> createState() => _DumbAppState();
}

class _DumbAppState extends State<DumbApp> {
  Locale? _locale;
  ThemeMode _themeMode = ThemeMode.system;

  @override
  void initState() {
    super.initState();
    _themeMode = widget.themeMode;
    _loadToken();
    _loadTelemetrySetting();
  }

  void _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString('token');
    if (_cachedToken != null) {
      _chatClient = ChatClient(baseUrl: apiUrl, token: _cachedToken);
    }
  }

  void _loadTelemetrySetting() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _telemetryEnabled = prefs.getBool('telemetry_enabled') ?? true;
    });
    if (_telemetryEnabled) {
      _startTelemetry();
    }
  }

  void _startTelemetry() async {
    Timer.periodic(const Duration(minutes: 5), (timer) {
      _sendTelemetry();
    });
    await _sendTelemetry();
  }

  Future<void> _sendTelemetry() async {
    if (!_telemetryEnabled) return;
    
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final batteryLevel = await _battery.batteryLevel;
      final batteryState = await _battery.batteryState;
      final isInBatterySaveMode = await _battery.isInBatterySaveMode;

      final directory = await getExternalStorageDirectory();
      final storageStat = directory != null ? await File(directory.path).stat() : null;
      
      final telemetryData = {
        'type': 'android',
        'device_id': androidInfo.id,
        'timestamp': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'brand': androidInfo.brand,
        'manufacturer': androidInfo.manufacturer,
        'android_version': androidInfo.version.release,
        'sdk': androidInfo.version.sdkInt,
        'battery_level': batteryLevel,
        'charging': batteryState == BatteryState.charging,
        'battery_saver_mode': isInBatterySaveMode,
        'rooted': false,
        'storage': {
          'total': storageStat != null ? storageStat.size : 0,
          'free': directory != null ? await _getFreeSpace(directory.path) : 0,
        },
        'model': androidInfo.model,
        'product': androidInfo.product,
        'hardware': androidInfo.hardware,
        'is_physical_device': androidInfo.isPhysicalDevice,
      };

      final response = await http.post(
        Uri.parse('$telemetryUrl/collect'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(telemetryData),
      );

      if (response.statusCode != 200) {
        print('Telemetry error: ${response.statusCode}');
      }
    } catch (e) {
      print('Telemetry failed: $e');
    }
  }

  Future<int> _getFreeSpace(String path) async {
    try {
      final stat = FileStat.statSync(path);
      return stat.size;
    } catch (e) {
      return 0;
    }
  }

  void setLocale(Locale locale) {
    setState(() => _locale = locale);
  }

  void setTheme(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _themeMode = mode);
    await prefs.setString('theme_mode',
        mode == ThemeMode.dark ? 'dark' : mode == ThemeMode.light ? 'light' : 'system');
  }

  void setTelemetryEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _telemetryEnabled = enabled);
    await prefs.setBool('telemetry_enabled', enabled);
  }

  void setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    url = url.replaceAll(RegExp(r'/+$'), '');
    setState(() => apiUrl = url);
    await prefs.setString('server_url', url);
    await prefs.remove('token');
    _cachedToken = null;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DUMB Android',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue, brightness: Brightness.dark),
        brightness: Brightness.dark,
      ),
      themeMode: _themeMode,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      locale: _locale,
      home: ServerSelectionScreen(
        setLocale: setLocale,
        setTheme: setTheme,
        setServerUrl: setServerUrl,
        setTelemetryEnabled: setTelemetryEnabled,
        telemetryEnabled: _telemetryEnabled,
        themeMode: _themeMode,
      ),
    );
  }
}

class ServerSelectionScreen extends StatefulWidget {
  final void Function(Locale) setLocale;
  final void Function(ThemeMode) setTheme;
  final void Function(String) setServerUrl;
  final void Function(bool) setTelemetryEnabled;
  final bool telemetryEnabled;
  final ThemeMode themeMode;

  const ServerSelectionScreen({
    required this.setLocale,
    required this.setTheme,
    required this.setServerUrl,
    required this.setTelemetryEnabled,
    required this.telemetryEnabled,
    required this.themeMode,
  });

  @override
  State<ServerSelectionScreen> createState() => _ServerSelectionScreenState();
}

class _ServerSelectionScreenState extends State<ServerSelectionScreen> {
  List<Map<String, String>> savedServers = [];
  late TextEditingController _nameController;
  late TextEditingController _urlController;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _urlController = TextEditingController();
    _loadSavedServers();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedServers() async {
    final prefs = await SharedPreferences.getInstance();
    final serversJson = prefs.getStringList('saved_servers') ?? [];
    setState(() {
      savedServers = serversJson.map((server) => Map<String, String>.from(json.decode(server))).toList();
    });
  }

  Future<void> _saveServer() async {
    String name = _nameController.text.trim();
    String url = _urlController.text.trim();
    url = url.replaceAll(RegExp(r'/+$'), '');
    
    if (name.isEmpty || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.invalidInput)),
      );
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final newServer = {'name': name, 'url': url};
    final serversJson = prefs.getStringList('saved_servers') ?? [];
    serversJson.add(json.encode(newServer));
    await prefs.setStringList('saved_servers', serversJson);
    
    _nameController.clear();
    _urlController.clear();
    await _loadSavedServers();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context)!.serverSaved)),
    );
  }

  Future<void> _deleteServer(int index) async {
    final prefs = await SharedPreferences.getInstance();
    final serversJson = prefs.getStringList('saved_servers') ?? [];
    serversJson.removeAt(index);
    await prefs.setStringList('saved_servers', serversJson);
    await _loadSavedServers();
  }

  Future<void> _connectToServer(String url) async {
    final uri = Uri.tryParse(url);

    if (url.isEmpty || uri == null || !uri.hasAbsolutePath) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.invalidUrl)),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final client = ChatClient(baseUrl: url);
      // Test connection by trying to get channels
      await client.getChannels();
      
      widget.setServerUrl(url);
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => AuthGate(
            setLocale: widget.setLocale,
            setTheme: widget.setTheme,
            setServerUrl: widget.setServerUrl,
            setTelemetryEnabled: widget.setTelemetryEnabled,
            telemetryEnabled: widget.telemetryEnabled,
            themeMode: widget.themeMode,
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${AppLocalizations.of(context)!.connectionError}: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)!.settings),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: Text(AppLocalizations.of(context)!.language),
                trailing: DropdownButton<Locale>(
                  value: Localizations.localeOf(context),
                  onChanged: (Locale? newLocale) {
                    if (newLocale != null) {
                      widget.setLocale(newLocale);
                      Navigator.pop(context);
                    }
                  },
                  items: AppLocalizations.supportedLocales.map((Locale locale) {
                    return DropdownMenuItem<Locale>(
                      value: locale,
                      child: Text(_getLanguageName(locale)),
                    );
                  }).toList(),
                ),
              ),
              ListTile(
                title: Text(AppLocalizations.of(context)!.theme),
                trailing: DropdownButton<ThemeMode>(
                  value: widget.themeMode,
                  onChanged: (ThemeMode? newTheme) {
                    if (newTheme != null) {
                      widget.setTheme(newTheme);
                      Navigator.pop(context);
                    }
                  },
                  items: [
                    DropdownMenuItem(
                      value: ThemeMode.system,
                      child: Text(AppLocalizations.of(context)!.system),
                    ),
                    DropdownMenuItem(
                      value: ThemeMode.light,
                      child: Text(AppLocalizations.of(context)!.light),
                    ),
                    DropdownMenuItem(
                      value: ThemeMode.dark,
                      child: Text(AppLocalizations.of(context)!.dark),
                    ),
                  ],
                ),
              ),
              SwitchListTile(
                title: Text('Telemetry'),
                value: widget.telemetryEnabled,
                onChanged: (value) {
                  widget.setTelemetryEnabled(value);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppLocalizations.of(context)!.close),
          ),
        ],
      ),
    );
  }

  String _getLanguageName(Locale locale) {
    switch (locale.languageCode) {
      case 'en': return 'English';
      case 'ru': return 'Русский';
      case 'uk': return 'украинский';
      default: return locale.languageCode;
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(loc.selectServer),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
            tooltip: loc.settings,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(labelText: loc.serverName),
                    ),
                    TextField(
                      controller: _urlController,
                      decoration: InputDecoration(labelText: loc.serverUrl),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _saveServer,
                      child: Text(loc.saveServer),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: savedServers.length,
                    itemBuilder: (context, index) {
                      final server = savedServers[index];
                      return ListTile(
                        title: Text(server['name'] ?? ''),
                        subtitle: Text(server['url'] ?? ''),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _deleteServer(index),
                        ),
                        onTap: () => _connectToServer(server['url']!),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  final void Function(Locale) setLocale;
  final void Function(ThemeMode) setTheme;
  final void Function(String) setServerUrl;
  final void Function(bool) setTelemetryEnabled;
  final bool telemetryEnabled;
  final ThemeMode themeMode;

  const AuthGate({
    required this.setLocale,
    required this.setTheme,
    required this.setServerUrl,
    required this.setTelemetryEnabled,
    required this.telemetryEnabled,
    required this.themeMode,
  });

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? token;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('token');
    _cachedToken = token;
    if (token != null) {
      try {
        _chatClient = ChatClient(baseUrl: apiUrl, token: token);
        await _chatClient.getChannels();
        
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ChannelsScreen(
              token: token!,
              setLocale: widget.setLocale,
              setTheme: widget.setTheme,
              setServerUrl: widget.setServerUrl,
              setTelemetryEnabled: widget.setTelemetryEnabled,
              telemetryEnabled: widget.telemetryEnabled,
              themeMode: widget.themeMode,
            ),
          ),
        );
        return;
      } catch (e) {
        print('Token validation failed: $e');
        prefs.remove('token');
        _cachedToken = null;
      }
    }
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return loading
        ? Scaffold(body: Center(child: Text(AppLocalizations.of(context)!.loading)))
        : AuthScreen(onLogin: (t) async {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('token', t);
            _cachedToken = t;
            _chatClient = ChatClient(baseUrl: apiUrl, token: t);
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (_) => ChannelsScreen(
                  token: t,
                  setLocale: widget.setLocale,
                  setTheme: widget.setTheme,
                  setServerUrl: widget.setServerUrl,
                  setTelemetryEnabled: widget.setTelemetryEnabled,
                  telemetryEnabled: widget.telemetryEnabled,
                  themeMode: widget.themeMode,
                ),
              ),
            );
          });
  }
}

class AuthScreen extends StatefulWidget {
  final void Function(String token) onLogin;
  const AuthScreen({required this.onLogin});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  String username = '', password = '', twoFactorToken = '';
  bool isLogin = true;
  bool loading = false, requires2FA = false;
  String error = '', sessionId = '';

  void _auth() async {
    setState(() {
      loading = true;
      error = '';
    });
    
    try {
      final client = ChatClient(baseUrl: apiUrl);
      
      if (isLogin) {
        final result = await client.login(
          username, 
          password, 
          twoFactorToken: requires2FA ? twoFactorToken : null
        );
        
        if (result.success) {
          widget.onLogin(result.token!);
        } else if (result.requires2FA) {
          setState(() {
            requires2FA = true;
            sessionId = result.sessionId ?? '';
            loading = false;
          });
        } else {
          setState(() {
            error = result.message ?? 'Login failed';
            loading = false;
          });
        }
      } else {
        // Registration
        final result = await client.register(username, password);
        if (result.success) {
          // Auto-login after registration
          final loginResult = await client.login(username, password);
          if (loginResult.success) {
            widget.onLogin(loginResult.token!);
          } else {
            setState(() {
              error = 'Registration successful but login failed';
              loading = false;
            });
          }
        } else {
          setState(() {
            error = 'Registration failed';
            loading = false;
          });
        }
      }
    } catch (e) {
      String errorMessage = 'Authentication failed';
      if (e is AuthException) {
        errorMessage = e.message;
      } else if (e is ChatException) {
        errorMessage = e.message;
      } else {
        errorMessage = e.toString();
      }
      
      if (errorMessage.contains('user exists') || errorMessage.contains('already exists')) {
        errorMessage = 'User already exists';
      }
      
      setState(() {
        error = errorMessage;
        loading = false;
      });
    }
  }

  void _verify2FA() async {
    setState(() {
      loading = true;
      error = '';
    });
    
    try {
      final client = ChatClient(baseUrl: apiUrl);
      final result = await client.verify2FALogin(username, sessionId, twoFactorToken);
      
      if (result.success) {
        widget.onLogin(result.token!);
      } else {
        setState(() {
          error = result.message ?? '2FA verification failed';
          loading = false;
        });
      }
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;
    
    if (requires2FA) {
      return Scaffold(
        appBar: AppBar(title: const Text('2FA Verification')),
        body: Center(
          child: SizedBox(
            width: 350,
            child: Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Enter 2FA Code',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      decoration: const InputDecoration(
                        labelText: '2FA Code',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (v) => twoFactorToken = v,
                      enabled: !loading,
                    ),
                    if (error.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Text(error, style: const TextStyle(color: Colors.red)),
                      ),
                    const SizedBox(height: 20),
                    loading
                        ? const CircularProgressIndicator()
                        : Row(
                            children: [
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: _verify2FA,
                                  child: const Text('Verify'),
                                ),
                              ),
                            ],
                          ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    
    return Scaffold(
      appBar: AppBar(title: Text(isLogin ? loc.login : loc.register)),
      body: Center(
        child: SizedBox(
          width: 350,
          child: Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    decoration: InputDecoration(labelText: loc.username),
                    onChanged: (v) => username = v,
                    enabled: !loading,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    decoration: InputDecoration(labelText: loc.password),
                    obscureText: true,
                    onChanged: (v) => password = v,
                    enabled: !loading,
                  ),
                  if (error.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Text(error, style: const TextStyle(color: Colors.red)),
                    ),
                  const SizedBox(height: 20),
                  loading
                      ? const CircularProgressIndicator()
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            ElevatedButton(
                              onPressed: _auth,
                              child: Text(isLogin ? loc.login : loc.register),
                            ),
                            TextButton(
                              onPressed: loading
                                  ? null
                                  : () => setState(() {
                                        isLogin = !isLogin;
                                        error = '';
                                        requires2FA = false;
                                      }),
                              child: Text(isLogin ? loc.register : loc.login),
                            ),
                          ],
                        ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ChannelsScreen extends StatefulWidget {
  final String token;
  final void Function(Locale) setLocale;
  final void Function(ThemeMode) setTheme;
  final void Function(String) setServerUrl;
  final void Function(bool) setTelemetryEnabled;
  final bool telemetryEnabled;
  final ThemeMode themeMode;

  const ChannelsScreen({
    required this.token,
    required this.setLocale,
    required this.setTheme,
    required this.setServerUrl,
    required this.setTelemetryEnabled,
    required this.telemetryEnabled,
    required this.themeMode,
  });

  @override
  State<ChannelsScreen> createState() => _ChannelsScreenState();
}

class _ChannelsScreenState extends State<ChannelsScreen> {
  List<Channel> channels = [];
  String error = '';
  bool loading = true;
  WebSocketChannel? _channel;

  @override
  void initState() {
    super.initState();
    _loadChannels();
    _connectWebSocket();
  }

  void _connectWebSocket() {
    try {
      _channel = _chatClient.createWebSocketChannel();
      _channel!.stream.listen(
        (message) {
          final data = jsonDecode(message);
          if (data['type'] == 'message' && data['action'] == 'new') {
            _loadChannels();
          }
        },
        onError: (error) {
          print('WebSocket error: $error');
        },
        onDone: () {
          print('WebSocket closed');
          Future.delayed(const Duration(seconds: 5), _connectWebSocket);
        },
      );
    } catch (e) {
      print('WebSocket connection failed: $e');
    }
  }

  @override
  void dispose() {
    _channel?.sink.close();
    super.dispose();
  }

  Future<void> _loadChannels() async {
    setState(() => loading = true);
    try {
      final channelsList = await _chatClient.getChannels();
      setState(() {
        channels = channelsList;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  void _createChannel() {
    showDialog(
      context: context,
      builder: (context) => CreateChannelDialog(
        onChannelCreated: _loadChannels,
      ),
    );
  }

  void _searchChannels() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SearchChannelsScreen(
          onChannelJoined: _loadChannels,
        ),
      ),
    );
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    _cachedToken = null;
    _avatarCache.clear();
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => ServerSelectionScreen(
          setLocale: widget.setLocale,
          setTheme: widget.setTheme,
          setServerUrl: widget.setServerUrl,
          setTelemetryEnabled: widget.setTelemetryEnabled,
          telemetryEnabled: widget.telemetryEnabled,
          themeMode: widget.themeMode,
        ),
      ),
    );
  }

  void _showProfileSettings() {
    showDialog(
      context: context,
      builder: (context) => ProfileSettingsDialog(),
    );
  }

  void _showSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)!.settings),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: Text(AppLocalizations.of(context)!.language),
                trailing: DropdownButton<Locale>(
                  value: Localizations.localeOf(context),
                  onChanged: (Locale? newLocale) {
                    if (newLocale != null) {
                      widget.setLocale(newLocale);
                      Navigator.pop(context);
                    }
                  },
                  items: AppLocalizations.supportedLocales.map((Locale locale) {
                    return DropdownMenuItem<Locale>(
                      value: locale,
                      child: Text(_getLanguageName(locale)),
                    );
                  }).toList(),
                ),
              ),
              ListTile(
                title: Text(AppLocalizations.of(context)!.theme),
                trailing: DropdownButton<ThemeMode>(
                  value: widget.themeMode,
                  onChanged: (ThemeMode? newTheme) {
                    if (newTheme != null) {
                      widget.setTheme(newTheme);
                      Navigator.pop(context);
                    }
                  },
                  items: [
                    DropdownMenuItem(
                      value: ThemeMode.system,
                      child: Text(AppLocalizations.of(context)!.system),
                    ),
                    DropdownMenuItem(
                      value: ThemeMode.light,
                      child: Text(AppLocalizations.of(context)!.light),
                    ),
                    DropdownMenuItem(
                      value: ThemeMode.dark,
                      child: Text(AppLocalizations.of(context)!.dark),
                    ),
                  ],
                ),
              ),
              SwitchListTile(
                title: Text('Telemetry'),
                value: widget.telemetryEnabled,
                onChanged: (value) {
                  widget.setTelemetryEnabled(value);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppLocalizations.of(context)!.close),
          ),
        ],
      ),
    );
  }

  String _getLanguageName(Locale locale) {
    switch (locale.languageCode) {
      case 'en': return 'English';
      case 'ru': return 'Русский';
      case 'uk': return 'украинский';
      default: return locale.languageCode;
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(loc.channels),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _searchChannels,
            tooltip: loc.search,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _createChannel,
            tooltip: loc.createChannel,
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: _showProfileSettings,
            tooltip: loc.profile,
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
            tooltip: loc.settings,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: loc.logout,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
              if (error.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(error, style: const TextStyle(color: Colors.red)),
                ),
              Expanded(
                child: channels.isEmpty
                    ? Center(child: Text(loc.noChannelsAvailable))
                    : ListView.builder(
                        itemCount: channels.length,
                        itemBuilder: (_, i) => ListTile(
                          title: Text(channels[i].name),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatScreen(channel: channels[i].name),
                            ),
                          ),
                        ),
                      ),
              ),
            ]),
    );
  }
}

class ProfileSettingsDialog extends StatefulWidget {
  const ProfileSettingsDialog();

  @override
  State<ProfileSettingsDialog> createState() => _ProfileSettingsDialogState();
}

class _ProfileSettingsDialogState extends State<ProfileSettingsDialog> {
  bool loading = false;
  String error = '';
  bool twoFactorEnabled = false;
  bool twoFactorLoading = false;

  @override
  void initState() {
    super.initState();
    _load2FAStatus();
  }

  Future<void> _load2FAStatus() async {
    setState(() => twoFactorLoading = true);
    try {
      final enabled = await _chatClient.get2FAStatus();
      setState(() {
        twoFactorEnabled = enabled;
      });
    } catch (e) {
      print('Failed to load 2FA status: $e');
    } finally {
      setState(() => twoFactorLoading = false);
    }
  }

  Future<void> _uploadAvatar() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      allowMultiple: false,
    );

    if (result == null || result.files.isEmpty) return;

    setState(() {
      loading = true;
      error = '';
    });

    try {
      final file = File(result.files.single.path!);
      await _chatClient.uploadAvatar(file);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Avatar updated successfully')),
      );
      Navigator.pop(context);
    } catch (e) {
      setState(() {
        error = 'Error uploading avatar: $e';
      });
    } finally {
      setState(() => loading = false);
    }
  }

  void _show2FASetup() {
    showDialog(
      context: context,
      builder: (context) => TwoFASetupDialog(
        onStatusChanged: _load2FAStatus,
      ),
    );
  }

  void _show2FADisable() {
    showDialog(
      context: context,
      builder: (context) => TwoFADisableDialog(
        onStatusChanged: _load2FAStatus,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Profile Settings'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(error, style: const TextStyle(color: Colors.red)),
            ),
          ElevatedButton(
            onPressed: loading ? null : _uploadAvatar,
            child: loading 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
                : const Text('Change Avatar'),
          ),
          const SizedBox(height: 16),
          ListTile(
            title: const Text('Two-Factor Authentication'),
            subtitle: twoFactorLoading 
                ? const Text('Loading...')
                : Text(twoFactorEnabled ? 'Enabled' : 'Disabled'),
            trailing: twoFactorEnabled
                ? ElevatedButton(
                    onPressed: _show2FADisable,
                    child: const Text('Disable'),
                  )
                : ElevatedButton(
                    onPressed: _show2FASetup,
                    child: const Text('Enable'),
                  ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    );
  }
}

class TwoFASetupDialog extends StatefulWidget {
  final VoidCallback onStatusChanged;

  const TwoFASetupDialog({required this.onStatusChanged});

  @override
  State<TwoFASetupDialog> createState() => _TwoFASetupDialogState();
}

class _TwoFASetupDialogState extends State<TwoFASetupDialog> {
  String secret = '';
  String qrCodeUrl = '';
  String token = '';
  String error = '';
  bool loading = false;
  bool setupCompleted = false;

  @override
  void initState() {
    super.initState();
    _startSetup();
  }

  Future<void> _startSetup() async {
    setState(() => loading = true);
    try {
      final setup = await _chatClient.setup2FA();
      setState(() {
        secret = setup.secret;
        qrCodeUrl = setup.qrCodeUrl;
      });
    } catch (e) {
      setState(() {
        error = 'Failed to setup 2FA: $e';
      });
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _verifyAndEnable() async {
    setState(() {
      loading = true;
      error = '';
    });
    try {
      await _chatClient.enable2FA(token);
      setState(() => setupCompleted = true);
      widget.onStatusChanged();
      Future.delayed(const Duration(seconds: 2), () {
        Navigator.pop(context);
      });
    } catch (e) {
      setState(() {
        error = 'Failed to enable 2FA: $e';
      });
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Enable Two-Factor Authentication'),
      content: setupCompleted
          ? const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 48),
                SizedBox(height: 16),
                Text('2FA has been enabled successfully!'),
              ],
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (loading && secret.isEmpty)
                  const CircularProgressIndicator()
                else if (error.isNotEmpty)
                  Text(error, style: const TextStyle(color: Colors.red))
                else if (secret.isNotEmpty)
                  Column(
                    children: [
                      const Text('Scan this QR code with your authenticator app:'),
                      const SizedBox(height: 16),
                      qrCodeUrl.isNotEmpty
                          ? Image.network(qrCodeUrl)
                          : const Text('QR code not available'),
                      const SizedBox(height: 16),
                      const Text('Or enter this secret manually:'),
                      Text(secret, style: const TextStyle(fontFamily: 'monospace')),
                      const SizedBox(height: 16),
                      TextField(
                        decoration: const InputDecoration(
                          labelText: 'Enter 6-digit code',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => token = value,
                      ),
                    ],
                  ),
              ],
            ),
      actions: setupCompleted
          ? []
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: loading || token.length != 6 ? null : _verifyAndEnable,
                child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
                    : const Text('Enable'),
              ),
            ],
    );
  }
}

class TwoFADisableDialog extends StatefulWidget {
  final VoidCallback onStatusChanged;

  const TwoFADisableDialog({required this.onStatusChanged});

  @override
  State<TwoFADisableDialog> createState() => _TwoFADisableDialogState();
}

class _TwoFADisableDialogState extends State<TwoFADisableDialog> {
  String token = '';
  String error = '';
  bool loading = false;
  bool disableCompleted = false;

  Future<void> _disable2FA() async {
    setState(() {
      loading = true;
      error = '';
    });
    try {
      await _chatClient.disable2FA(token);
      setState(() => disableCompleted = true);
      widget.onStatusChanged();
      Future.delayed(const Duration(seconds: 2), () {
        Navigator.pop(context);
      });
    } catch (e) {
      setState(() {
        error = 'Failed to disable 2FA: $e';
      });
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Disable Two-Factor Authentication'),
      content: disableCompleted
          ? const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 48),
                SizedBox(height: 16),
                Text('2FA has been disabled successfully!'),
              ],
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Enter your 2FA code to disable two-factor authentication:'),
                const SizedBox(height: 16),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Enter 6-digit code',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) => token = value,
                ),
                if (error.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(error, style: const TextStyle(color: Colors.red)),
                  ),
              ],
            ),
      actions: disableCompleted
          ? []
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: loading || token.length != 6 ? null : _disable2FA,
                child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
                    : const Text('Disable'),
              ),
            ],
    );
  }
}

class CreateChannelDialog extends StatefulWidget {
  final VoidCallback onChannelCreated;

  const CreateChannelDialog({required this.onChannelCreated});

  @override
  State<CreateChannelDialog> createState() => _CreateChannelDialogState();
}

class _CreateChannelDialogState extends State<CreateChannelDialog> {
  String name = '';
  bool loading = false;
  String error = '';

  Future<void> _createChannel() async {
    if (name.isEmpty) {
      setState(() => error = 'Channel name is required');
      return;
    }

    setState(() => loading = true);
    try {
      await _chatClient.createChannel(name);
      widget.onChannelCreated();
      Navigator.pop(context);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Create Channel'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            decoration: const InputDecoration(labelText: 'Channel Name'),
            onChanged: (v) => name = v,
          ),
          if (error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(error, style: const TextStyle(color: Colors.red)),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: loading ? null : _createChannel,
          child: loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
              : const Text('Create'),
        ),
      ],
    );
  }
}

class SearchChannelsScreen extends StatefulWidget {
  final VoidCallback onChannelJoined;

  const SearchChannelsScreen({required this.onChannelJoined});

  @override
  State<SearchChannelsScreen> createState() => _SearchChannelsScreenState();
}

class _SearchChannelsScreenState extends State<SearchChannelsScreen> {
  List<Channel> channels = [];
  String query = '';
  bool loading = false;
  String error = '';

  Future<void> _searchChannels() async {
    if (query.isEmpty) return;

    setState(() => loading = true);
    try {
      final results = await _chatClient.searchChannels(query);
      setState(() {
        channels = results;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> _joinChannel(String channelName) async {
    try {
      await _chatClient.joinChannel(channelName);
      widget.onChannelJoined();
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to join channel: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Channels'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: 'Search channels',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (v) => query = v,
                    onSubmitted: (_) => _searchChannels(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: _searchChannels,
                ),
              ],
            ),
          ),
          if (error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(error, style: const TextStyle(color: Colors.red)),
            ),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : channels.isEmpty
                    ? const Center(child: Text('No channels found'))
                    : ListView.builder(
                        itemCount: channels.length,
                        itemBuilder: (_, i) => ListTile(
                          title: Text(channels[i].name),
                          trailing: ElevatedButton(
                            onPressed: () => _joinChannel(channels[i].name),
                            child: const Text('Join'),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class ChatScreen extends StatefulWidget {
  final String channel;

  const ChatScreen({required this.channel});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<ChatMessage> messages = [];
  String input = '';
  bool loading = true;
  String error = '';
  WebSocketChannel? _channel;
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _textController = TextEditingController();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioRecorder _audioRecorder = AudioRecorder(); // Исправлено на AudioRecorder
  bool _isRecording = false;
  String? _recordingPath;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _connectWebSocket();
    _requestPermissions();
  }

  void _requestPermissions() async {
    await Permission.microphone.request();
    await Permission.storage.request();
  }

  void _connectWebSocket() {
    try {
      _channel = _chatClient.createWebSocketChannel();
      _channel!.stream.listen(
        (message) {
          final data = jsonDecode(message);
          if (data['type'] == 'message' && data['action'] == 'new' && data['channel'] == widget.channel) {
            _loadMessages();
          }
        },
        onError: (error) {
          print('WebSocket error: $error');
        },
        onDone: () {
          print('WebSocket closed');
          Future.delayed(const Duration(seconds: 5), _connectWebSocket);
        },
      );
    } catch (e) {
      print('WebSocket connection failed: $e');
    }
  }

  @override
  void dispose() {
    _channel?.sink.close();
    _scrollController.dispose();
    _textController.dispose();
    _audioPlayer.dispose();
    _audioRecorder.dispose(); // Освобождение ресурсов
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final messagesList = await _chatClient.getMessages(widget.channel);
      setState(() {
        messages = messagesList;
        loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _sendMessage() async {
    if (input.trim().isEmpty) return;

    final message = input;
    _textController.clear();
    setState(() => input = '');

    try {
      await _chatClient.sendMessage(
        channel: widget.channel,
        text: message,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send message: $e')),
      );
      setState(() => input = message);
    }
  }

  Future<void> _pickAndSendFile() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
    );

    if (result == null || result.files.isEmpty) return;

    final file = File(result.files.single.path!);

    try {
      await _chatClient.uploadFile(file);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('File uploaded successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to upload file: $e')),
      );
    }
  }

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final tempDir = await getTemporaryDirectory();
        final path = '${tempDir.path}/recording_${DateTime.now().millisecondsSinceEpoch}.m4a';
        
        await _audioRecorder.start(const RecordConfig(), path: path);
        setState(() {
          _isRecording = true;
          _recordingPath = path;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start recording: $e')),
      );
    }
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _audioRecorder.stop();
      setState(() => _isRecording = false);

      if (path != null) {
        final file = File(path);
        // Загружаем аудио файл
        final fileAttachment = await _chatClient.uploadFile(file);
        // Отправляем сообщение с файлом вложения
        await _chatClient.sendMessage(
          channel: widget.channel,
          text: 'Voice message',
          fileId: fileAttachment.filename, // Используем filename как fileId
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send recording: $e')),
      );
    } finally {
      setState(() {
        _recordingPath = null;
      });
    }
  }

  Future<void> _playAudio(String url) async {
    try {
      await _audioPlayer.setUrl(url);
      await _audioPlayer.play();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to play audio: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.channel),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMessages,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          if (_isRecording)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              color: Colors.red,
              child: const Center(
                child: Text(
                  'Recording...',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    children: [
                      if (error.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(error, style: const TextStyle(color: Colors.red)),
                        ),
                      Expanded(
                        child: messages.isEmpty
                            ? Center(child: Text(AppLocalizations.of(context)!.noMessages))
                            : ListView.builder(
                                controller: _scrollController,
                                itemCount: messages.length,
                                itemBuilder: (_, i) => ChatMessageBubble(
                                  message: messages[i],
                                  onPlayAudio: _playAudio,
                                ),
                              ),
                      ),
                    ],
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.attach_file),
                  onPressed: _pickAndSendFile,
                  tooltip: 'Attach file',
                ),
                IconButton(
                  icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                  onPressed: _isRecording ? _stopRecording : _startRecording,
                  tooltip: _isRecording ? 'Stop recording' : 'Record voice',
                ),
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: AppLocalizations.of(context)!.typeMessage,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (v) => setState(() => input = v),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: input.trim().isEmpty ? null : _sendMessage,
                  tooltip: 'Send message',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ChatMessageBubble extends StatelessWidget {
  final ChatMessage message;
  final void Function(String url) onPlayAudio;

  const ChatMessageBubble({
    required this.message,
    required this.onPlayAudio,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            child: Text(message.from[0].toUpperCase()),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.from,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  if (message.text.isNotEmpty)
                    Text(message.text),
                  if (message.file != null)
                    _buildFileAttachment(message.file!),
                  if (message.voice != null)
                    _buildVoiceAttachment(message.voice!),
                  const SizedBox(height: 4),
                  Text(
                    _formatTimestamp(message.timestamp),
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFileAttachment(FileAttachment file) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('📎 File attachment:'),
          Text('Name: ${file.originalName}'),
          Text('Size: ${_formatFileSize(file.size)}'),
          if (file.downloadUrl.isNotEmpty)
            TextButton(
              onPressed: () {
                // TODO: Implement file download
              },
              child: const Text('Download'),
            ),
        ],
      ),
    );
  }

  Widget _buildVoiceAttachment(VoiceAttachment voice) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.play_arrow),
            onPressed: () => onPlayAudio(voice.downloadUrl),
          ),
          Text('Voice message (${voice.duration}s)'),
        ],
      ),
    );
  }

  String _formatFileSize(int size) {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) return 'now';
    if (difference.inHours < 1) return '${difference.inMinutes}m';
    if (difference.inDays < 1) return '${difference.inHours}h';
    if (difference.inDays < 7) return '${difference.inDays}d';
    
    return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
  }
}
