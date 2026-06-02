const MEDIATOR_URL = 'http://192.168.1.9:4450';

export const mediatorLogin = async (userId: string, password: string, ) => {
 const requestBody = {
  employeeId: userId,
  password,
  
};
  console.log('LOGIN BODY =>', requestBody);

  const response = await fetch(`${MEDIATOR_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });


  const text = await response.text();

  console.log('STATUS =>', response.status);
  console.log('RAW RESPONSE =>', text);

  return JSON.parse(text);
};
