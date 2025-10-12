import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
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

String apiUrl = 'http://localhost:3000';
String telemetryUrl = 'http://dumb-analytics.akaruineko.space:7634';
String? _cachedToken;
final Map<String, String> _avatarCache = {};
final Battery _battery = Battery();
bool _telemetryEnabled = true;

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
      final resp = await http.get(Uri.parse('$url/ping'));
      if (resp.statusCode == 200) {
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
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.serverUnreachable)),
        );
      }
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
        final resp = await http.get(
          Uri.parse('$apiUrl/channels'),
          headers: {'Authorization': 'Bearer $token'},
        );
        final json = jsonDecode(resp.body);
        if (resp.statusCode == 200 && json['success'] == true) {
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
        }
      } catch (e) {}
      prefs.remove('token');
      _cachedToken = null;
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
    final url = isLogin ? '$apiUrl/login' : '$apiUrl/register';
    final resp = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        if (requires2FA) 'twoFactorToken': twoFactorToken
      }),
    );
    final json = jsonDecode(resp.body);
    
    if (resp.statusCode == 200 && json['success'] == true) {
      if (json['token'] != null) {
        widget.onLogin(json['token']);
      } else if (json['requires2FA'] == true) {
        setState(() {
          requires2FA = true;
          sessionId = json['sessionId'] ?? '';
          loading = false;
        });
      }
    } else {
      String errorMessage = json['error'] ?? json['message'] ?? AppLocalizations.of(context)!.error;
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
    final resp = await http.post(
      Uri.parse('$apiUrl/2fa/verify-login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'sessionId': sessionId,
        'twoFactorToken': twoFactorToken
      }),
    );
    final json = jsonDecode(resp.body);
    if (json['success'] == true && json['token'] != null) {
      widget.onLogin(json['token']);
    } else {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
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
  List channels = [];
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
      final wsUrl = apiUrl.replaceFirst('http', 'ws');
      final uri = Uri.parse('$wsUrl?token=${_cachedToken}');
      _channel = WebSocketChannel.connect(uri);
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
    final resp = await http.get(
      Uri.parse('$apiUrl/channels'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    final json = jsonDecode(resp.body);
    if (json['success'] == true) {
      setState(() {
        channels = json['channels'] ?? [];
        loading = false;
      });
    } else {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
        loading = false;
      });
    }
  }

  void _createChannel() {
    showDialog(
      context: context,
      builder: (context) => CreateChannelDialog(
        token: widget.token,
        onChannelCreated: _loadChannels,
      ),
    );
  }

  void _searchChannels() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SearchChannelsScreen(
          token: widget.token,
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
      builder: (context) => ProfileSettingsDialog(token: widget.token),
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
                          title: Text(channels[i]['name'] ?? ''),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatScreen(token: widget.token, channel: channels[i]['name']),
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
  final String token;
  const ProfileSettingsDialog({required this.token});

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
      final resp = await http.get(
        Uri.parse('$apiUrl/2fa/status'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      final json = jsonDecode(resp.body);
      if (json['success'] == true) {
        setState(() {
          twoFactorEnabled = json['enabled'] ?? false;
        });
      }
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
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$apiUrl/upload/avatar'),
      );
      request.headers['Authorization'] = 'Bearer ${widget.token}';
      request.files.add(await http.MultipartFile.fromPath(
        'avatar',
        result.files.single.path!,
      ));

      var response = await request.send();
      var responseData = await response.stream.bytesToString();
      var json = jsonDecode(responseData);

      if (json['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Avatar updated successfully')),
        );
        Navigator.pop(context);
      } else {
        setState(() {
          error = json['error'] ?? 'Failed to upload avatar';
        });
      }
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
        token: widget.token,
        onStatusChanged: _load2FAStatus,
      ),
    );
  }

  void _show2FADisable() {
    showDialog(
      context: context,
      builder: (context) => TwoFADisableDialog(
        token: widget.token,
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
  final String token;
  final VoidCallback onStatusChanged;

  const TwoFASetupDialog({required this.token, required this.onStatusChanged});

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
      final resp = await http.post(
        Uri.parse('$apiUrl/2fa/setup'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      final json = jsonDecode(resp.body);
      if (json['success'] == true) {
        setState(() {
          secret = json['secret'] ?? '';
          qrCodeUrl = json['qrCode'] ?? '';
        });
      } else {
        setState(() {
          error = json['error'] ?? 'Failed to setup 2FA';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Error: $e';
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
      final resp = await http.post(
        Uri.parse('$apiUrl/2fa/verify-and-enable'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
        body: jsonEncode({'token': token}),
      );
      final json = jsonDecode(resp.body);
      if (json['success'] == true) {
        setState(() => setupCompleted = true);
        widget.onStatusChanged();
        Future.delayed(const Duration(seconds: 2), () {
          Navigator.pop(context);
        });
      } else {
        setState(() {
          error = json['error'] ?? 'Invalid token';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Error: $e';
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
                if (loading && qrCodeUrl.isEmpty)
                  const CircularProgressIndicator()
                else if (qrCodeUrl.isNotEmpty)
                  Column(
                    children: [
                      const Text('Scan this QR code with your authenticator app:'),
                      const SizedBox(height: 16),
                      Image.network(qrCodeUrl),
                      const SizedBox(height: 16),
                      const Text('Or enter this secret manually:'),
                      Text(secret, style: const TextStyle(fontFamily: 'monospace')),
                      const SizedBox(height: 16),
                      TextField(
                        decoration: const InputDecoration(
                          labelText: 'Verification Code',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (v) => token = v,
                      ),
                    ],
                  ),
                if (error.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(error, style: const TextStyle(color: Colors.red)),
                  ),
              ],
            ),
      actions: setupCompleted
          ? [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ]
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: loading ? null : _verifyAndEnable,
                child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
                    : const Text('Enable'),
              ),
            ],
    );
  }
}

class TwoFADisableDialog extends StatefulWidget {
  final String token;
  final VoidCallback onStatusChanged;

  const TwoFADisableDialog({required this.token, required this.onStatusChanged});

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
      final resp = await http.post(
        Uri.parse('$apiUrl/2fa/disable'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
        body: jsonEncode({'token': token}),
      );
      final json = jsonDecode(resp.body);
      if (json['success'] == true) {
        setState(() => disableCompleted = true);
        widget.onStatusChanged();
        Future.delayed(const Duration(seconds: 2), () {
          Navigator.pop(context);
        });
      } else {
        setState(() {
          error = json['error'] ?? 'Invalid token';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Error: $e';
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
                const Text('Enter your current 2FA code to disable two-factor authentication:'),
                const SizedBox(height: 16),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Verification Code',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (v) => token = v,
                ),
                if (error.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(error, style: const TextStyle(color: Colors.red)),
                  ),
              ],
            ),
      actions: disableCompleted
          ? [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ]
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: loading ? null : _disable2FA,
                child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
                    : const Text('Disable'),
              ),
            ],
    );
  }
}

class CreateChannelDialog extends StatefulWidget {
  final String token;
  final VoidCallback onChannelCreated;
  const CreateChannelDialog({required this.token, required this.onChannelCreated});

  @override
  State<CreateChannelDialog> createState() => _CreateChannelDialogState();
}

class _CreateChannelDialogState extends State<CreateChannelDialog> {
  String name = '', description = '', error = '';
  bool loading = false;

  void _create() async {
    setState(() {
      loading = true;
      error = '';
    });
    final resp = await http.post(
      Uri.parse('$apiUrl/channels'),
      headers: {
        'Authorization': 'Bearer ${widget.token}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'name': name, 'description': description}),
    );
    final json = jsonDecode(resp.body);
    if (json['success'] == true) {
      widget.onChannelCreated();
      Navigator.pop(context);
    } else {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(AppLocalizations.of(context)!.createChannel),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            decoration: InputDecoration(labelText: AppLocalizations.of(context)!.channelName),
            onChanged: (v) => name = v,
            enabled: !loading,
          ),
          TextField(
            decoration: InputDecoration(labelText: AppLocalizations.of(context)!.description),
            onChanged: (v) => description = v,
            enabled: !loading,
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
          onPressed: loading ? null : () => Navigator.pop(context),
          child: Text(AppLocalizations.of(context)!.cancel),
        ),
        ElevatedButton(
          onPressed: loading ? null : _create,
          child: loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator())
              : Text(AppLocalizations.of(context)!.create),
        ),
      ],
    );
  }
}

class SearchChannelsScreen extends StatefulWidget {
  final String token;
  final VoidCallback onChannelJoined;
  const SearchChannelsScreen({required this.token, required this.onChannelJoined});

  @override
  State<SearchChannelsScreen> createState() => _SearchChannelsScreenState();
}

class _SearchChannelsScreenState extends State<SearchChannelsScreen> {
  List channels = [];
  String query = '', error = '';
  bool loading = false;

  void _search() async {
    setState(() {
      loading = true;
      error = '';
    });
    final resp = await http.get(
      Uri.parse('$apiUrl/channels/search?q=$query'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    final json = jsonDecode(resp.body);
    if (json['success'] == true) {
      setState(() {
        channels = json['channels'] ?? [];
        loading = false;
      });
    } else {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
        loading = false;
      });
    }
  }

  void _join(String channel) async {
    setState(() => loading = true);
    final resp = await http.post(
      Uri.parse('$apiUrl/channels/$channel/join'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    final json = jsonDecode(resp.body);
    if (json['success'] == true) {
      widget.onChannelJoined();
      Navigator.pop(context);
    } else {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(loc.search)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(
              child: TextField(
                decoration: InputDecoration(labelText: loc.search),
                onChanged: (v) => query = v,
                onSubmitted: (_) => _search(),
              ),
            ),
            IconButton(
              onPressed: _search,
              icon: const Icon(Icons.search),
            ),
          ]),
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
                  ? Center(child: Text(loc.noChannelsFound))
                  : ListView.builder(
                      itemCount: channels.length,
                      itemBuilder: (_, i) => ListTile(
                        title: Text(channels[i]['name'] ?? ''),
                        subtitle: Text(channels[i]['description'] ?? ''),
                        trailing: ElevatedButton(
                          onPressed: () => _join(channels[i]['name']),
                          child: Text(loc.join),
                        ),
                      ),
                    ),
        ),
      ]),
    );
  }
}

class ChatScreen extends StatefulWidget {
  final String token;
  final String channel;
  const ChatScreen({required this.token, required this.channel});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List messages = [];
  String message = '', error = '';
  bool loading = true;
  WebSocketChannel? _channel;
  final ScrollController _scrollController = ScrollController();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final Record _audioRecorder = Record();
  bool _isRecording = false;
  Timer? _recordingTimer;
  int _recordingDuration = 0;

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
      final wsUrl = apiUrl.replaceFirst('http', 'ws');
      final uri = Uri.parse('$wsUrl?token=${_cachedToken}');
      _channel = WebSocketChannel.connect(uri);
      _channel!.stream.listen(
        (message) {
          final data = jsonDecode(message);
          if (data['type'] == 'message' && data['action'] == 'new' && data['channel'] == widget.channel) {
            setState(() => messages.add(data['message']));
            _scrollToBottom();
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
    _audioPlayer.dispose();
    _stopRecording();
    _recordingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => loading = true);
    final resp = await http.get(
      Uri.parse('$apiUrl/channels/${widget.channel}/messages'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    final json = jsonDecode(resp.body);
    if (json['success'] == true) {
      setState(() {
        messages = json['messages'] ?? [];
        loading = false;
      });
      _scrollToBottom();
    } else {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
        loading = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() async {
    if (message.trim().isEmpty) return;
    final msg = message;
    setState(() => message = '');
    final resp = await http.post(
      Uri.parse('$apiUrl/channels/${widget.channel}/messages'),
      headers: {
        'Authorization': 'Bearer ${widget.token}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'content': msg}),
    );
    final json = jsonDecode(resp.body);
    if (json['success'] != true) {
      setState(() {
        error = json['error'] ?? AppLocalizations.of(context)!.error;
        message = msg;
      });
    }
  }

  Future<void> _sendVoiceMessage(String filePath) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$apiUrl/channels/${widget.channel}/messages'),
      );
      request.headers['Authorization'] = 'Bearer ${widget.token}';
      request.files.add(await http.MultipartFile.fromPath(
        'voice',
        filePath,
      ));

      var response = await request.send();
      var responseData = await response.stream.bytesToString();
      var json = jsonDecode(responseData);

      if (json['success'] != true) {
        setState(() {
          error = json['error'] ?? 'Failed to send voice message';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Error sending voice message: $e';
      });
    }
  }

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final tempDir = await getTemporaryDirectory();
        final filePath = '${tempDir.path}/voice_message_${DateTime.now().millisecondsSinceEpoch}.ogg';
        
        await _audioRecorder.start(
          path: filePath,
          encoder: AudioEncoder.opus,
          bitRate: 128000,
          samplingRate: 48000,
        );
        
        setState(() {
          _isRecording = true;
          _recordingDuration = 0;
        });
        
        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          setState(() {
            _recordingDuration = timer.tick;
          });
        });
      }
    } catch (e) {
      setState(() {
        error = 'Failed to start recording: $e';
      });
    }
  }

  Future<void> _stopRecording() async {
    _recordingTimer?.cancel();
    _recordingTimer = null;
    
    if (_isRecording) {
      final path = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
        _recordingDuration = 0;
      });
      
      if (path != null) {
        await _sendVoiceMessage(path);
      }
    }
  }

  Future<void> _playVoiceMessage(String url) async {
    try {
      await _audioPlayer.setUrl(url);
      await _audioPlayer.play();
    } catch (e) {
      setState(() {
        error = 'Failed to play voice message: $e';
      });
    }
  }

  Widget _buildMessageContent(Map msg) {
    final content = msg['content'] ?? '';
    final attachments = msg['attachments'] ?? [];
    final voiceMessage = msg['voiceMessage'];

    if (voiceMessage != null && voiceMessage['url'] != null) {
      final mimeType = lookupMimeType(voiceMessage['url']) ?? '';
      if (mimeType.startsWith('audio/')) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.play_arrow),
                  onPressed: () => _playVoiceMessage(voiceMessage['url']),
                ),
                const Text('Voice message'),
              ],
            ),
            if (content.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(content),
              ),
          ],
        );
      }
    }

    final List<Widget> contentWidgets = [];
    
    if (content.isNotEmpty) {
      contentWidgets.add(Text(content));
    }

    for (final attachment in attachments) {
      final url = attachment['url'];
      final mimeType = lookupMimeType(url) ?? '';
      
      if (mimeType.startsWith('image/')) {
        contentWidgets.add(Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: CachedNetworkImage(
            imageUrl: url,
            placeholder: (context, url) => Container(
              width: 200,
              height: 150,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(child: CircularProgressIndicator()),
            ),
            errorWidget: (context, url, error) => Container(
              width: 200,
              height: 150,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(child: Icon(Icons.error)),
            ),
            width: 200,
            height: 150,
            fit: BoxFit.cover,
          ),
        ));
      } else {
        contentWidgets.add(Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: Text('[Attachment: ${attachment['filename']}]'),
        ));
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: contentWidgets,
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(widget.channel)),
      body: Column(children: [
        if (error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Text(error, style: const TextStyle(color: Colors.red)),
          ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : messages.isEmpty
                  ? Center(child: Text(loc.noMessages))
                  : ListView.builder(
                      controller: _scrollController,
                      itemCount: messages.length,
                      itemBuilder: (_, i) {
                        final msg = messages[i];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundImage: _getAvatarImage(msg['author']?['avatar']),
                            child: msg['author']?['avatar'] == null
                                ? Text((msg['author']?['username'] ?? '?')[0].toUpperCase())
                                : null,
                          ),
                          title: Text(msg['author']?['username'] ?? '?'),
                          subtitle: _buildMessageContent(msg),
                          trailing: Text(_formatTimestamp(msg['timestamp'])),
                        );
                      },
                    ),
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(children: [
            IconButton(
              icon: Icon(_isRecording ? Icons.stop : Icons.mic),
              onPressed: _isRecording ? _stopRecording : _startRecording,
              color: _isRecording ? Colors.red : null,
            ),
            if (_isRecording)
              Text('$_recordingDuration s'),
            Expanded(
              child: TextField(
                decoration: InputDecoration(
                  labelText: loc.typeMessage,
                  border: const OutlineInputBorder(),
                ),
                onChanged: (v) => message = v,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            IconButton(
              onPressed: _sendMessage,
              icon: const Icon(Icons.send),
            ),
          ]),
        ),
      ]),
    );
  }

  ImageProvider? _getAvatarImage(String? avatarUrl) {
    if (avatarUrl == null) return null;
    if (_avatarCache.containsKey(avatarUrl)) {
      return NetworkImage(_avatarCache[avatarUrl]!);
    }
    _avatarCache[avatarUrl] = avatarUrl;
    return NetworkImage(avatarUrl);
  }

  String _formatTimestamp(String timestamp) {
    try {
      final dt = DateTime.parse(timestamp).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return timestamp;
    }
  }
}
