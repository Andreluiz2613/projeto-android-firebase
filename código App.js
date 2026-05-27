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
  SafeAreaView,
  Linking,
} from 'react-native';



// ================= AUTH =================
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

import { auth } from './firebaseConfig';

const Auth = {

  register: async (email, password) => {

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return true;
  },

  login: async (email, password) => {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return true;
  }
};

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

import { db } from './firebaseConfig';

// ================= ORÇAMENTOS =================
const Orcamento = {

  save: async ({ quantidade, precoUnitario, total }) => {

    await addDoc(
      collection(db, 'orcamentos'),
      {
        quantidade,
        precoUnitario,
        total,
        createdAt: new Date()
      }
    );

    return true;
  },

  list: async (setList) => {

    const q = query(
      collection(db, 'orcamentos'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    const lista = [];

    querySnapshot.forEach((doc) => {

      lista.push({
        id: doc.id,
        ...doc.data()
      });

    });

    setList(lista);
  }
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

      Alert.alert('Erro', 'Preencha tudo');
      return;
    }

    setLoading(true);

    // ===== CADASTRO =====
    if (!isLogin) {

      if (pass !== confirm) {

        Alert.alert('Erro', 'Senhas diferentes');
        setLoading(false);
        return;
      }

      try {

        await Auth.register(email, pass);

        Alert.alert('Sucesso', 'Conta criada');

        setIsLogin(true);

      } catch {

        Alert.alert('Erro', 'Usuário já existe');

      } finally {

        setLoading(false);
      }

      return;
    }

    // ===== LOGIN =====
    const ok = await Auth.login(email, pass);

    if (ok) {

      onLogin();

    } else {

      Alert.alert('Erro', 'Login inválido');
    }

    setLoading(false);
  };

  return (

    <View style={styles.container}>

      <View style={styles.content}>

        <Text style={styles.title}>
          Etiquetas
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          onChangeText={setEmail}
        />

        {!isLogin && (

          <TextInput
            style={styles.input}
            placeholder="Confirmar senha"
            placeholderTextColor="#666"
            secureTextEntry
            onChangeText={setConfirm}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#666"
          secureTextEntry
          onChangeText={setPass}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handle}
        >

          {loading
            ? <ActivityIndicator color="#fff" />
            : (
              <Text style={styles.btnText}>
                {isLogin ? 'ENTRAR' : 'CADASTRAR'}
              </Text>
            )
          }

        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsLogin(!isLogin)}
        >

          <Text style={styles.link}>
            {isLogin
              ? 'Criar conta'
              : 'Já tenho conta'}
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

  useEffect(() => {

  load();

}, []);

  const load = async () => {

  await Orcamento.list(setList);

};

  const total =
    ((+qtd || 0) * (+preco || 0)).toFixed(2);

  const save = async () => {

    await Orcamento.save({
      quantidade: qtd,
      precoUnitario: preco,
      total
    });

    setQtd('');
    setPreco('');

    load();
  };

  const whatsapp = (item) => {

    const msg =
`O Orçamento da Qtd: ${item.quantidade} ficaria em um Total de: R$ ${item.total}`;

    Linking.openURL(
      `https://wa.me/?text=${encodeURIComponent(msg)}`
    );
  };

  const email = (item) => {

    const msg =
`O Orçamento da Qtd: ${item.quantidade} ficaria em um Total de: R$ ${item.total}`;

    Linking.openURL(
      `mailto:?subject=Orçamento&body=${encodeURIComponent(msg)}`
    );
  };

  return (

    <View style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

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
            placeholder="Preço"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={preco}
            onChangeText={setPreco}
          />

          <Text style={styles.total}>
            Total: R$ {total}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={save}
          >

            <Text style={styles.btnText}>
              SALVAR
            </Text>

          </TouchableOpacity>

          <FlatList
            data={list}
            scrollEnabled={false}
            keyExtractor={(i) => i.id.toString()}
            contentContainerStyle={{
              alignItems: 'center',
              paddingBottom: 20,
            }}
            renderItem={({ item }) => (

              <View style={styles.card}>

                <Text style={styles.cardText}>
                  Qtd: {item.quantidade}
                </Text>

                <Text style={styles.cardText}>
                  Total: R$ {item.total}
                </Text>

                <TouchableOpacity
                  style={styles.wpp}
                  onPress={() => whatsapp(item)}
                >

                  <Text style={styles.btnText}>
                    WhatsApp
                  </Text>

                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mail}
                  onPress={() => email(item)}
                >

                  <Text style={styles.btnText}>
                    Email
                  </Text>

                </TouchableOpacity>

              </View>
            )}
          />

          <TouchableOpacity
            style={styles.logout}
            onPress={onLogout}
          >

            <Text style={styles.btnText}>
              SAIR
            </Text>

          </TouchableOpacity>

        </View>

      </ScrollView>

    </View>
  );
};

// ================= APP =================
export default function App() {

  const [screen, setScreen] = useState('login');

  useEffect(() => {

    initDB();

  }, []);

  return (

    <SafeAreaView style={{ flex: 1 }}>

      {screen === 'login'
        ? (
          <LoginScreen
            onLogin={() => setScreen('home')}
          />
        )
        : (
          <Home
            onLogout={() => setScreen('login')}
          />
        )
      }

    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#C97B2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },

  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#fff',
    width: '90%',
    padding: 14,
    marginTop: 12,
    borderRadius: 10,
    fontSize: 16,
  },

  button: {
    backgroundColor: '#007AFF',
    width: '90%',
    padding: 14,
    marginTop: 20,
    borderRadius: 10,
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  link: {
    marginTop: 18,
    color: '#000',
    fontSize: 16,
    textAlign: 'center',
  },

  logout: {
    backgroundColor: 'red',
    width: '90%',
    padding: 12,
    borderRadius: 10,
    marginTop: 25,
    marginBottom: 30,
    alignItems: 'center',
  },

  total: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#fff',
    width: '90%',
    padding: 16,
    borderRadius: 12,
    marginTop: 15,
  },

  cardText: {
    fontSize: 16,
    marginBottom: 5,
  },

  wpp: {
    backgroundColor: '#25D366',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },

  mail: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  }

});
