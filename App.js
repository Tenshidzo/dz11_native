import {useState, useEffect} from 'react';
import {Alert, Button, StyleSheet, Text, TextInput, View, FlatList, TouchableOpacity} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {createStackNavigator} from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import {NavigationContainer} from "@react-navigation/native";

const Stack = createStackNavigator();

const RegisterScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    

    const register = async () => {
        if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert('Помилка', 'Будь ласка, заповніть всі поля');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Помилка', 'Паролі не співпадають');
            return;
        }

        const existingUsers = await AsyncStorage.getItem('users');
        const users = existingUsers ? JSON.parse(existingUsers) : [];

        if (users.some(user => user.username === username)) {
            Alert.alert('Помилка', 'Користувач з таким іменем вже існує');
            return;
        }

        users.push({ username, password });
        await AsyncStorage.setItem('users', JSON.stringify(users));
        Alert.alert('Успіх', 'Реєстрація пройшла успішно!');
        navigation.replace('Login');
    };
    

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Реєстрація</Text>
            <TextInput style={styles.input} placeholder="Логін" value={username} onChangeText={setUsername} />
            <TextInput style={styles.input} placeholder="Пароль" value={password} onChangeText={setPassword} secureTextEntry />
            <TextInput style={styles.input} placeholder="Повторіть пароль" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <TouchableOpacity style={styles.saveButton} onPress={register}>
                <Text style={styles.saveButtonText}>Зареєструватися</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Вже маєте акаунт? Увійти</Text>
            </TouchableOpacity>
        </View>
    );
};

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

      const login = async () => {
        const users = await AsyncStorage.getItem('users');
        if (!users) {
            Alert.alert('Помилка', 'Користувач не знайдений');
            return;
        }
    
        const parsedUsers = JSON.parse(users);
        const user = parsedUsers.find(u => u.username === username && u.password === password);
    
        if (user) {
            const now = new Date().toISOString();
            let history = JSON.parse(await AsyncStorage.getItem('loginHistory')) || [];
            history.unshift(now);
            if (history.length > 5) history = history.slice(0, 5);
            await AsyncStorage.setItem('loginHistory', JSON.stringify(history));
            await AsyncStorage.setItem('loggedInUser', username);
            navigation.replace('Tasks');
        } else {
            Alert.alert('Помилка', 'Невірний логін або пароль');
        }
    };
    

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Логін</Text>
            <TextInput style={styles.input} placeholder="Логін" value={username} onChangeText={setUsername} />
            <TextInput style={styles.input} placeholder="Пароль" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.saveButton} onPress={login}>
                <Text style={styles.saveButtonText}>Увійти</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText}>Немає акаунту? Зареєструватися</Text>
            </TouchableOpacity>
        </View>
    );
};



const TaskScreen = ({ navigation }) => {
    const [tasks, setTasks] = useState([]);
    const [username, setUsername] = useState('');
    const [loginHistory, setLoginHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchHistory = async () => {
        const history = JSON.parse(await AsyncStorage.getItem('loginHistory')) || [];
        setLoginHistory(history);
      };

    useEffect(() => {
        loadsTasks();
        loadUser();
        fetchHistory();
    }, []);
    

    const loadsTasks = async () => {
        const user = await AsyncStorage.getItem('loggedInUser');
        if (user) {
            const storedTasks = await AsyncStorage.getItem(`tasks_${user}`);
            if (storedTasks) {
                const tasksForCurrentUser = JSON.parse(storedTasks);
                setTasks(tasksForCurrentUser);
            } else {
                setTasks([]);
            }
        }
    };

    const loadUser = async () => {
        const user = await AsyncStorage.getItem('loggedInUser');
        if (user) {
            setUsername(user);
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('loggedInUser');
        navigation.replace('Login');
    };

    const saveTasks = async (newTasks) => {
        await AsyncStorage.setItem(`tasks_${username}`, JSON.stringify(newTasks));
        setTasks(newTasks);
    };

    const updateTask = (updatedTask) => {
        const updatedTasks = tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
        saveTasks(updatedTasks);
    };

    const deleteTask = (id) => {
        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const newTasks = tasks.filter(task => task.id !== id);
                        saveTasks(newTasks);
                    }
                }
            ]
        );
    };
    const clearAllTasks = async () => {
        Alert.alert(
            'Видалити всі завдання',
            'Ви впевнені, що хочете видалити всі завдання?',
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Видалити',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem(`tasks_${username}`);
                        setTasks([]);
                    }
                }
            ]
        );
    };
    
    const sortTasks = (type) => {
        let sortedTasks = [...tasks];
        if (type === 'status') {
            sortedTasks.sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1);
        } else if (type === 'date') {
            sortedTasks.sort((a, b) => new Date(b.id) - new Date(a.id));
        }
        setTasks(sortedTasks);
    };
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setIsSearching(false);
            setFilteredTasks([]);
            return;
        }
        setIsSearching(true);
        const user = await AsyncStorage.getItem('loggedInUser');
        if (user) {
            const storedTasks = await AsyncStorage.getItem(`tasks_${user}`);
            const allTasks = storedTasks ? JSON.parse(storedTasks) : [];
            const searchResults = allTasks.filter(task => task.text.toLowerCase().includes(searchQuery.toLowerCase()));
            setFilteredTasks(searchResults);
        }
    };
    

    const toggleTaskCompletion = async (taskId) => {
        const user = await AsyncStorage.getItem('loggedInUser');
        if (!user) return;
    
        const updatedTasks = tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        setTasks(updatedTasks);
        await AsyncStorage.setItem(`tasks_${user}`, JSON.stringify(updatedTasks));
    
        if (isSearching) {
            const updatedFilteredTasks = filteredTasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
            );
            setFilteredTasks(updatedFilteredTasks);
        }
    };
    
    

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tasks:</Text>
            <Text style={styles.userText}>Ви увійшли як: {username}</Text>
            <TextInput
                style={styles.input}
                placeholder="Пошук завдань..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
            />
    
            {tasks.length === 0 ? (
                <Text style={styles.emptyText}>Список порожній</Text>
            ) : (
                <FlatList
                    data={isSearching ? filteredTasks : tasks}
                    renderItem={({ item, index }) => (
                        <View>
                            <View style={styles.taskItemContainer}>
                                <TouchableOpacity
                                    style={styles.taskItem}
                                    onPress={() =>
                                        navigation.navigate('TaskDetails', {
                                            task: item,
                                            updateTask
                                        })
                                    }
                                >
                                    <Text style={styles.taskText} numberOfLines={1}>
                                        {item.text}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => toggleTaskCompletion(item.id)}
                                >
                                    <Text style={styles.addButtonText}>
                                        {item.completed ? 'Виконано' : 'Не виконано'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteTask(item.id)}>
                                    <Ionicons name="close-outline" size={24} color="#ff5c5c" />
                                </TouchableOpacity>
                            </View>
                            {index < tasks.length - 1 && <View style={styles.separator} />}
                        </View>
                    )}
                    keyExtractor={(item) => item.id}
                />
            )}
            <Text style={styles.title}>Історія входів:</Text>
            {loginHistory.length === 0 ? (
                <Text style={styles.emptyText}>Немає записів</Text>
            ) : (
                <FlatList
                    data={loginHistory}
                    renderItem={({ item }) => (
                        <Text style={styles.historyItem}>
                            {new Intl.DateTimeFormat('uk-UA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                            }).format(new Date(item))}
                        </Text>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                />
            )}
    
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddTask', { saveTasks, tasks })}
            >
                <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.addIcon} />
                <Text style={styles.addButtonText}>Add New Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => sortTasks('status')}>
        <Text style={styles.addButtonText}>Сортувати за статусом</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.addButton} onPress={() => sortTasks('date')}>
        <Text style={styles.addButtonText}>Сортувати за датою</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.addButton} onPress={clearAllTasks}>
        <Text style={styles.addButtonText}>Видалити всі</Text>
    </TouchableOpacity>
    
            <TouchableOpacity onPress={logout} style={styles.addButton}>
                <Ionicons name="log-out-outline" size={24} color="#fff" style={styles.addIcon} />
                <Text style={styles.addButtonText}>Вийти з аккаунта</Text>
            </TouchableOpacity>
        </View>
    );
    
    
};


const TaskDetailsScreen = ({route, navigation}) => {
    const {task, updateTask} = route.params;
    const [taskText, setTaskText] = useState(task.text);

    const saveTask = async () => {
        if (!taskText.trim()) {
            alert('Task text cannot be empty')
        }

        updateTask({...task, text: taskText});
        navigation.goBack();

    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Change your task:</Text>
            <TextInput
                style={styles.input}
                value={taskText}
                onChangeText={setTaskText}
                multiline
            />
            <TouchableOpacity
                style={styles.addButton}
                onPress={saveTask}
            >
                <Text style={styles.addButtonText}>Save</Text>
            </TouchableOpacity>
        </View>
    )
}

const AddTaskScreen = ({route, navigation}) => {
    const {saveTasks, tasks} = route.params;
    const [taskText, setTaskText] = useState('');

    const addTask = async () => {
        if (!taskText.trim()) {
            alert('Task text cannot be empty')
        }

        const newTask = {
            id: new Date().toString(),
            text: taskText,
            completed: false
        }

        saveTasks([...tasks, newTask]);
        navigation.goBack();

    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add new Task</Text>
            <TextInput
                style={styles.textArea}
                placeholder="Enter your task details here..."
                value={taskText}
                onChangeText={setTaskText}
                multiline
            />
            <TouchableOpacity
                style={styles.saveButton}
                onPress={addTask}
            >
                <Text style={styles.saveButtonText}>Save Task</Text>
            </TouchableOpacity>
        </View>
    );
}

const App = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Tasks" component={TaskScreen}/>
                <Stack.Screen name="AddTask" component={AddTaskScreen}/>
                <Stack.Screen name="TaskDetails" component={TaskDetailsScreen}/>
            </Stack.Navigator>
        </NavigationContainer>

    )
}

export default App;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    taskItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 10,
    }
    ,
    taskItem: {
        flex: 1,
        padding: 10,
    },
    taskText: {
        fontSize: 16,
    },
    addButton: {
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'blue',
        padding: 12,
        borderRadius: 10,
        marginTop: 20,
    },
    addIcon: {
        marginRight: 8, 
    },
    addButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#fff',
        fontSize: 16,
        marginBottom: 10,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#fff',
        fontSize: 16,
        marginBottom: 10,
        minHeight: 150,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    separator: {
        height: 1,
        backgroundColor: '#ccc',
        marginHorizontal: 10,
    },
    
    
});