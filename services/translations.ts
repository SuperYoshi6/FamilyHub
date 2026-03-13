
import { AppRoute } from "../types";

export type Language = 'de' | 'en';

export const t = (key: string, lang: Language): string => {
  const keys = key.split('.');
  let current: any = translations[lang];
  for (const k of keys) {
    if (current[k] === undefined) return key;
    current = current[k];
  }
  return current;
};

const translations = {
  de: {
    nav: {
      dashboard: 'Home',
      weather: 'Wetter',
      calendar: 'Kalender',
      meals: 'Essen',
      lists: 'Listen',
    },
    dashboard: {
      greeting: 'Hallo',
      good_day: 'Einen schönen Tag.',
      weather_details: 'DETAILS',
      shopping_list: 'Einkaufsliste',
      all_done: 'Alles erledigt',
      items_open: 'offen',
      meal_plan: 'Heute essen',
      nothing_planned: 'Nichts geplant',
      my_tasks: 'Meine Aufgaben',
      tasks_open: 'Aufgaben offen',
      all_tasks_done: 'Alles erledigt! 🎉',
      appointments_today: 'Termine heute',
      all: 'Alle',
      no_appointments: 'Keine Termine für heute.',
      location_error: 'Standort?',
      loading: 'Lade...',
    },
    settings: {
      title: 'Einstellungen',
      profile: 'MEIN PROFIL',
      display_name: 'Anzeigename',
      change_password: 'Passwort ändern',
      new_password: 'Neues Passwort',
      your_color: 'DEINE FARBE',
      generate_avatar: 'KI-Avatar generieren',
      app_settings: 'APP EINSTELLUNGEN',
      dark_mode: 'Dunkelmodus',
      notifications: 'Benachrichtigungen',
      notifications_desc: 'Für Aufgaben und Termine',
      language: 'Sprache',
      family_management: 'FAMILIENVERWALTUNG',
      set_temp_pass: 'Passwort setzen',
      set_pass_confirm: 'Neues Passwort für {name} setzen:',
      reset_success: 'Gespeichert',
      info_help: 'INFO & HILFE',
      about: 'Über die App',
      feedback: 'Feedback geben',
      save: 'Speichern',
      logout: 'Abmelden',
      logout_confirm_title: 'Abmelden?',
      logout_confirm_text: 'Möchtest du dich wirklich abmelden?',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      only_parents: 'Nur für Eltern sichtbar',
    },
    login: {
      welcome: 'Willkommen zuhause.',
      hello: 'Hallo',
      enter_pass: 'Bitte Passwort eingeben',
      create_pass: 'Erstelle ein Passwort',
      pass_placeholder: 'Passwort',
      new_pass_placeholder: 'Neues Passwort',
      wrong_pass: 'Falsches Passwort',
      login_btn: 'Anmelden',
      set_pass_btn: 'Passwort festlegen',
    },
    header: {
      logged_in_as: 'Angemeldet als',
    }
  },
  en: {
    nav: {
      dashboard: 'Home',
      weather: 'Weather',
      calendar: 'Calendar',
      meals: 'Meals',
      lists: 'Lists',
    },
    dashboard: {
      greeting: 'Hello',
      good_day: 'Have a wonderful day.',
      weather_details: 'DETAILS',
      shopping_list: 'Shopping List',
      all_done: 'All clear',
      items_open: 'items',
      meal_plan: 'On the Menu',
      nothing_planned: 'Nothing planned',
      my_tasks: 'My Tasks',
      tasks_open: 'pending',
      all_tasks_done: 'All done! 🎉',
      appointments_today: 'Today\'s Schedule',
      all: 'View All',
      no_appointments: 'No appointments for today.',
      location_error: 'Location?',
      loading: 'Loading...',
    },
    settings: {
      title: 'Settings',
      profile: 'MY PROFILE',
      display_name: 'Display Name',
      change_password: 'Change Password',
      new_password: 'New Password',
      your_color: 'THEME COLOR',
      generate_avatar: 'Generate AI Avatar',
      app_settings: 'APP SETTINGS',
      dark_mode: 'Dark Mode',
      notifications: 'Notifications',
      notifications_desc: 'For tasks and events',
      language: 'Language',
      family_management: 'FAMILY MANAGEMENT',
      set_temp_pass: 'Set Password',
      set_pass_confirm: 'Set new password for {name}:',
      reset_success: 'Saved',
      info_help: 'INFO & HELP',
      about: 'About',
      feedback: 'Send Feedback',
      save: 'Save Changes',
      logout: 'Sign Out',
      logout_confirm_title: 'Sign Out?',
      logout_confirm_text: 'Are you sure you want to sign out?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      only_parents: 'Visible to parents only',
    },
    login: {
      welcome: 'Welcome home.',
      hello: 'Hello',
      enter_pass: 'Please enter your password',
      create_pass: 'Create a password',
      pass_placeholder: 'Password',
      new_pass_placeholder: 'New Password',
      wrong_pass: 'Incorrect password',
      login_btn: 'Sign In',
      set_pass_btn: 'Set Password',
    },
    header: {
      logged_in_as: 'Signed in as',
    }
  }
};
