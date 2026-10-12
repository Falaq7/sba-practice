export function pinCredentials(username,pin,{signup=false}={}){
 const handle=String(username||'').trim().toLowerCase();
 if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('Use 3–24 letters, numbers or underscores for your username.');
 if(!/^\d{4}$/.test(String(pin)))throw Error('Enter a four-digit PIN.');
 return {handle,email:`${handle}@users.sba-workspace.app`,password:`SBA4:${handle}:${pin}:workspace`};
}
export function usernameFor(user){const email=user?.email||'';return email.endsWith('@users.sba-workspace.app')?email.split('@')[0]:user?.displayName||'Account';}
