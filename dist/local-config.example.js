// Copy this file to dist/local-config.js and fill it in. local-config.js stays
// on this computer: .gitignore keeps it out of the repository, because it
// holds the household's default sign-in details.
//
// familyName:      default usernames are first initial + this (e.g. "msmith").
//                  Leave it empty and they are first names in lower case.
// passwordPattern: everyone's default password; {name} becomes the person's
//                  first name (e.g. "{name}-change-me" -> "Oliver-change-me").
//                  Leave it empty and there are no default passwords: only
//                  people whose password an admin has set can sign in.
window.HOUSE_MANUAL_LOCAL = {
  familyName: '',
  passwordPattern: ''
};
