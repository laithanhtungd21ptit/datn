import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerToggleButton,
} from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentClassesScreen from '../screens/student/StudentClassesScreen';
import StudentClassDetailScreen from '../screens/student/StudentClassDetailScreen';
import StudentAssignmentsScreen from '../screens/student/StudentAssignmentsScreen';
import StudentPracticeScreen from '../screens/student/StudentPracticeScreen';
import StudentProfileScreen from '../screens/student/StudentProfileScreen';
import StudentExamScreen from '../screens/student/StudentExamScreen';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherClassesScreen from '../screens/teacher/TeacherClassesScreen';
import TeacherAssignmentsScreen from '../screens/teacher/TeacherAssignmentsScreen';
import TeacherMonitoringScreen from '../screens/teacher/TeacherMonitoringScreen';
import TeacherClassDetailScreen from '../screens/teacher/TeacherClassDetailScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminAccountsScreen from '../screens/admin/AdminAccountsScreen';
import AdminClassesScreen from '../screens/admin/AdminClassesScreen';
import { APP_TITLE } from '../config/constants';
import StudentNotificationsButton from '../components/StudentNotificationsButton';
import TeacherNotificationsButton from '../components/TeacherNotificationsButton';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const TeacherStack = createNativeStackNavigator();

const FullScreenLoader = () => (
  <View
    style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    }}
  >
    <ActivityIndicator size="large" color="#ad171c" />
  </View>
);

const DrawerLogoutWrapper: React.FC<DrawerContentComponentProps> = props => {
  const { logout } = useAuth();
  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingBottom: 0 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <TouchableOpacity
        onPress={logout}
        style={{
          margin: 16,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#ad171c',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#ad171c', fontWeight: '600' }}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const StudentDrawerContent = (props: DrawerContentComponentProps) => (
  <DrawerLogoutWrapper {...props} />
);

const StudentInnerDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      headerTitle: APP_TITLE,
      headerRight: () => <StudentNotificationsButton />,
      headerTintColor: '#ad171c',
      drawerActiveTintColor: '#ad171c',
      drawerInactiveTintColor: '#475569',
    }}
    drawerContent={props => <StudentDrawerContent {...props} />}
  >
    <Drawer.Screen
      name="StudentDashboard"
      component={StudentDashboardScreen}
      options={{ title: 'Dashboard' }}
    />
    <Drawer.Screen
      name="StudentClasses"
      component={StudentClassesScreen}
      options={{ title: 'Lớp học' }}
    />
    <Drawer.Screen
      name="StudentAssignments"
      component={StudentAssignmentsScreen}
      options={{ title: 'Bài tập' }}
    />
    <Drawer.Screen
      name="StudentPractice"
      component={StudentPracticeScreen}
      options={{ title: 'Thực hành' }}
    />
    <Drawer.Screen
      name="StudentProfile"
      component={StudentProfileScreen}
      options={{ title: 'Tài khoản' }}
    />
  </Drawer.Navigator>
);

const StudentStack = createNativeStackNavigator();

const StudentNavigator = () => (
  <StudentStack.Navigator
    screenOptions={{
      headerRight: () => <StudentNotificationsButton />,
      headerTintColor: '#ad171c',
      headerBackTitle: 'Quay lại',
    }}
  >
    <StudentStack.Screen
      name="StudentHome"
      component={StudentInnerDrawer}
      options={{ headerShown: false }}
    />
    <StudentStack.Screen
      name="StudentClassDetail"
      component={StudentClassDetailScreen}
      options={{ title: 'Chi tiết lớp học' }}
    />
    <StudentStack.Screen
      name="StudentExam"
      component={StudentExamScreen}
      options={{ headerShown: false }}
    />
  </StudentStack.Navigator>
);

const teacherScreens = [
  { name: 'TeacherDashboard', title: 'Trang chủ', component: TeacherDashboardScreen },
  { name: 'TeacherClasses', title: 'Quản lý lớp học', component: TeacherClassesScreen },
  { name: 'TeacherAssignments', title: 'Quản lý bài tập', component: TeacherAssignmentsScreen },
  { name: 'TeacherMonitoring', title: 'Giám sát học tập', component: TeacherMonitoringScreen },
];

const TeacherInnerDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      headerTitle: APP_TITLE,
      headerLeft: () => <DrawerToggleButton tintColor="#ad171c" />,
      headerRight: () => <TeacherNotificationsButton />,
      headerTintColor: '#ad171c',
      drawerActiveTintColor: '#ad171c',
      drawerInactiveTintColor: '#475569',
    }}
    drawerContent={props => <DrawerLogoutWrapper {...props} />}
  >
    {teacherScreens.map(screen => (
      <Drawer.Screen
        key={screen.name}
        name={screen.name}
        component={screen.component}
        options={{ title: screen.title }}
      />
    ))}
  </Drawer.Navigator>
);

const TeacherNavigator = () => (
  <TeacherStack.Navigator
    screenOptions={{
      headerTintColor: '#ad171c',
      headerBackTitle: 'Quay lại',
      headerRight: () => <TeacherNotificationsButton />,
    }}
  >
    <TeacherStack.Screen
      name="TeacherHome"
      component={TeacherInnerDrawer}
      options={{ headerShown: false }}
    />
    <TeacherStack.Screen
      name="TeacherClassDetail"
      component={TeacherClassDetailScreen}
      options={{ title: 'Chi tiết lớp học' }}
    />
  </TeacherStack.Navigator>
);

const adminScreens = [
  { name: 'AdminDashboard', title: 'Dashboard', component: AdminDashboardScreen },
  { name: 'AdminAccounts', title: 'Quản lý tài khoản', component: AdminAccountsScreen },
  { name: 'AdminClasses', title: 'Lớp học / Môn học', component: AdminClassesScreen },
];

const AdminDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      headerTitle: APP_TITLE,
      headerLeft: () => <DrawerToggleButton tintColor="#ad171c" />,
      headerTintColor: '#ad171c',
      drawerActiveTintColor: '#ad171c',
      drawerInactiveTintColor: '#475569',
    }}
    drawerContent={props => <DrawerLogoutWrapper {...props} />}
  >
    {adminScreens.map(screen => (
      <Drawer.Screen
        key={screen.name}
        name={screen.name}
        component={screen.component}
        options={{ title: screen.title }}
      />
    ))}
  </Drawer.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Normalize role to handle case variations
  const normalizedRole = user.role?.toLowerCase();

  if (normalizedRole === 'student') {
    return <StudentNavigator />;
  }

  if (normalizedRole === 'teacher') {
    return <TeacherNavigator />;
  }

  if (normalizedRole === 'admin') {
    return <AdminDrawer />;
  }

  // Fallback: log error and show login screen
  console.error('Unknown user role:', user.role, 'User:', user);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;

