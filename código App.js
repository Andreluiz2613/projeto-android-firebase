import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
 
// ================= FIREBASE CONFIG =================
const API_KEY = "AIzaSyDA-EfIgc_Ai283VuJHgo86gC3YWovn7pw";
const PROJECT_ID = "projeto-android-756a1";
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts`;
const DB_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
 
// ================= AUTH =================
const Auth = {
  register: async (email, password) => {
    const res = await fetch(`${AUTH_URL}:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  },
 
  login: async (email, password) => {
    const res = await fetch(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  },
};
 
// ================= FIRESTORE HELPERS =================
const toFirestore = (obj) => {
  const fields = {};
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { doubleValue: val };
    else if (val instanceof Date) fields[key] = { timestampValue: val.toISOString() };
  }
  return { fields };
};
 
const fromFirestore = (doc) => {
  const result = { id: doc.name.split('/').pop() };
  for (const key in doc.fields) {
    const field = doc.fields[key];
    result[key] =
      field.stringValue ??
      field.doubleValue ??
      field.integerValue ??
      field.timestampValue ??
      null;
  }
  return result;
};
 
// ================= ORÇAMENTOS =================
const Orcamento = {
  save: async ({ quantidade, precoUnitario, total }) => {
    const res = await fetch(`${DB_URL}/orcamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestore({
        quantidade,
        precoUnitario,
        total,
        createdAt: new Date(),
      })),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  },
 
  list: async () => {
    const res = await fetch(
      `${DB_URL}/orcamentos?orderBy=createdAt&pageSize=50`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.documents) return [];
    return data.documents.map(fromFirestore);
  },
};
 
// ================= LOGIN =================
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
 
  const handle = async () => {
    if (!email || !pass) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    setLoading(true);
 
    if (!isLogin) {
      if (pass !== confirm) {
        Alert.alert('Erro', 'As senhas são diferentes');
        setLoading(false);
        return;
      }
      try {
        await Auth.register(email, pass);
        Alert.alert('Sucesso', 'Conta criada! Faça login.');
        setIsLogin(true);
      } catch (e) {
        Alert.alert('Erro ao cadastrar', e.message || 'Dados inválidos');
      } finally {
        setLoading(false);
      }
      return;
    }
 
    try {
      await Auth.login(email, pass);
      onLogin();
    } catch (e) {
      Alert.alert('Erro ao entrar', e.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Etiquetas</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#666"
          secureTextEntry
          onChangeText={setPass}
          value={pass}
        />
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Confirmar senha"
            placeholderTextColor="#666"
            secureTextEntry
            onChangeText={setConfirm}
            value={confirm}
          />
        )}
        <TouchableOpacity style={styles.button} onPress={handle} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{isLogin ? 'ENTRAR' : 'CADASTRAR'}</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.link}>
            {isLogin ? 'Criar conta' : 'Já tenho conta'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
 
// ================= HOME =================
const Home = ({ onLogout }) => {
  const [qtd, setQtd] = useState('');
  const [preco, setPreco] = useState('');
  const [list, setList] = useState([]);
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    try {
      const lista = await Orcamento.list();
      setList(lista);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os orçamentos');
    }
  };
 
  const total = ((+qtd || 0) * (+preco || 0)).toFixed(2);
 
  const save = async () => {
    if (!qtd || !preco) {
      Alert.alert('Erro', 'Preencha quantidade e preço');
      return;
    }
    try {
      await Orcamento.save({ quantidade: qtd, precoUnitario: preco, total });
      setQtd('');
      setPreco('');
      load();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o orçamento');
    }
  };
 
  const whatsapp = (item) => {
    const msg = `O Orçamento da Qtd: ${item.quantidade} ficaria em um Total de: R$ ${item.total}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };
 
  const sendEmail = (item) => {
    const msg = `O Orçamento da Qtd: ${item.quantidade} ficaria em um Total de: R$ ${item.total}`;
    Linking.openURL(`mailto:?subject=Orçamento&body=${encodeURIComponent(msg)}`);
  };
 
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TextInput
            style={styles.input}
            placeholder="Quantidade"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={qtd}
            onChangeText={setQtd}
          />
          <TextInput
            style={styles.input}
            placeholder="Preço Unitário"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={preco}
            onChangeText={setPreco}
          />
          <Text style={styles.total}>Total: R$ {total}</Text>
          <TouchableOpacity style={styles.button} onPress={save}>
            <Text style={styles.btnText}>SALVAR</Text>
          </TouchableOpacity>
          <FlatList
            data={list}
            scrollEnabled={false}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardText}>Qtd: {item.quantidade}</Text>
                <Text style={styles.cardText}>Total: R$ {item.total}</Text>
                <TouchableOpacity style={styles.wpp} onPress={() => whatsapp(item)}>
                  <Text style={styles.btnText}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mail} onPress={() => sendEmail(item)}>
                  <Text style={styles.btnText}>Email</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity style={styles.logout} onPress={onLogout}>
            <Text style={styles.btnText}>SAIR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
 
// ================= APP =================
export default function App() {
  const [screen, setScreen] = useState('login');
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        {screen === 'login'
          ? <LoginScreen onLogin={() => setScreen('home')} />
          : <Home onLogout={() => setScreen('login')} />
        }
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
 
// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C97B2A', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#fff', width: '90%', padding: 14, marginTop: 12, borderRadius: 10, fontSize: 16 },
  button: { backgroundColor: '#007AFF', width: '90%', padding: 14, marginTop: 20, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 18, color: '#000', fontSize: 16, textAlign: 'center' },
  logout: { backgroundColor: 'red', width: '90%', padding: 12, borderRadius: 10, marginTop: 25, marginBottom: 30, alignItems: 'center' },
  total: { marginTop: 20, fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  card: { backgroundColor: '#fff', width: '90%', padding: 16, borderRadius: 12, marginTop: 15 },
  cardText: { fontSize: 16, marginBottom: 5 },
  wpp: { backgroundColor: '#25D366', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  mail: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
});
 
