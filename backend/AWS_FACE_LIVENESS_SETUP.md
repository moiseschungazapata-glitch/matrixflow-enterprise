# Configuración aislada de AWS Face Liveness para MatrixFlow

Esta guía crea recursos exclusivos para MatrixFlow dentro de la misma cuenta AWS.
No reutiliza colecciones, usuarios IAM ni credenciales del otro proyecto.

## 0. Proteger la cuenta antes de crear recursos

1. No pulsar **Actualizar plan**. Si la cuenta muestra **Free plan**, AWS indica que no
   cargará la tarjeta mientras no se convierta voluntariamente al plan de pago.
2. Abrir [AWS Billing > Budgets](https://console.aws.amazon.com/cost-management/home#/budgets).
3. Crear un presupuesto mensual llamado `MatrixFlow-Control-Costo` por **USD 1**.
4. Añadir alertas de gasto real al **50 %** y **100 %**, dirigidas al correo del dueño
   de la cuenta.
5. Revisar también el saldo y la fecha de expiración de los créditos en
   [Billing > Credits](https://console.aws.amazon.com/billing/home#/credits).

Face Liveness no es ilimitadamente gratuito: AWS publica un precio por cada comprobación.
En `us-east-1`, el precio publicado para las primeras 500 000 comprobaciones mensuales es
USD 0.015 por comprobación. En el plan gratuito el consumo puede descontarse de los créditos;
si AWS indica que Rekognition no está disponible sin actualizar el plan, detenerse y no
actualizarlo sin aceptar primero el posible cobro. Consultar siempre la
[tarifa vigente de Rekognition](https://aws.amazon.com/rekognition/pricing/).

## Arquitectura aplicada

1. FastAPI crea una sesión de Face Liveness y la vincula al usuario encontrado por DNI.
2. El navegador recibe credenciales temporales de un Identity Pool de Cognito que sólo
   permiten iniciar el video de esa sesión.
3. AWS devuelve al backend la prueba de vida y una imagen de referencia temporal.
4. FastAPI busca ese rostro únicamente en la colección `matrixflow-users`.
5. Sólo cuando la prueba de vida y el rostro coinciden se emite el JWT de MatrixFlow.

Las grabaciones de la prueba no se guardan en Supabase. La colección de Rekognition
conserva la plantilla facial registrada, no el archivo que el administrador seleccionó.

## 1. Mantener la región correcta

Usar `us-east-1` (Norte de Virginia) en todos los recursos de esta guía. Face Liveness,
la colección y el Identity Pool deben utilizar la misma región.

## 2. Crear la colección facial exclusiva

1. Abrir [AWS CloudShell en us-east-1](https://console.aws.amazon.com/cloudshell/home?region=us-east-1).
2. Esperar a que aparezca el prompt.
3. Ejecutar:

```bash
aws rekognition create-collection \
  --collection-id matrixflow-users \
  --region us-east-1 \
  --tags Project=MatrixFlow,Environment=Production
```

4. Confirmar que la respuesta contiene `StatusCode: 200`.
5. Si AWS indica que la colección ya existe, no crear otra y comprobarla con:

```bash
aws rekognition describe-collection \
  --collection-id matrixflow-users \
  --region us-east-1
```

## 3. Crear el usuario IAM del backend

1. Abrir [IAM > Users](https://console.aws.amazon.com/iam/home#/users).
2. Pulsar **Create user**.
3. Nombre: `matrixflow-backend`.
4. No habilitar acceso a la consola para este usuario.
5. Crear el usuario sin copiar permisos del otro proyecto.
6. Abrir el usuario y entrar a **Permissions > Add permissions > Create inline policy**.
7. Elegir **JSON** y pegar la política siguiente, reemplazando `<ACCOUNT_ID>` por el
   ID de 12 dígitos de la cuenta AWS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MatrixFlowFaceLivenessBackend",
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateFaceLivenessSession",
        "rekognition:GetFaceLivenessSessionResults"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    },
    {
      "Sid": "MatrixFlowFaceCollectionOnly",
      "Effect": "Allow",
      "Action": [
        "rekognition:DescribeCollection",
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:DeleteFaces"
      ],
      "Resource": "arn:aws:rekognition:us-east-1:<ACCOUNT_ID>:collection/matrixflow-users"
    }
  ]
}
```

8. Nombre de la política: `MatrixFlowRekognitionBackendPolicy`.
9. Abrir **Security credentials > Access keys > Create access key**.
10. Seleccionar el caso de uso **Application running outside AWS** o equivalente.
11. Copiar una sola vez `Access key ID` y `Secret access key` en un administrador de
    contraseñas. Nunca crear una access key del usuario root.

## 4. Crear el Identity Pool para el navegador

Este recurso no reemplaza los usuarios de Supabase. Sólo entrega credenciales temporales
al componente oficial de AWS para transmitir la prueba de vida.

1. Abrir [Cognito Identity Pools en us-east-1](https://us-east-1.console.aws.amazon.com/cognito/v2/identity/identity-pools?region=us-east-1).
2. Pulsar **Create identity pool**.
3. Nombre: `matrixflow-liveness`.
4. Habilitar **Guest access** o **Unauthenticated identities**.
5. Crear un rol IAM nuevo para invitados llamado `matrixflow-liveness-guest-role`.
6. Terminar la creación y copiar el **Identity pool ID**. Su formato es
   `us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
7. Abrir [IAM > Roles](https://console.aws.amazon.com/iam/home#/roles).
8. Buscar `matrixflow-liveness-guest-role`.
9. Abrir **Permissions > Add permissions > Create inline policy > JSON**.
10. Pegar:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StartMatrixFlowLivenessOnly",
      "Effect": "Allow",
      "Action": "rekognition:StartFaceLivenessSession",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

11. Nombre: `MatrixFlowStartFaceLivenessPolicy`.
12. No añadir `AmazonRekognitionFullAccess` y no modificar el rol del otro proyecto.

## 5. Actualizar Supabase

Abrir **Supabase > SQL Editor > New query**, pegar y ejecutar una sola vez:

```sql
alter table public.users
  add column if not exists aws_face_id varchar(255),
  add column if not exists face_enrolled_at timestamptz;

create unique index if not exists ix_users_aws_face_id
  on public.users (aws_face_id);

create table if not exists public.face_verification_attempts (
  id varchar(36) primary key,
  user_id integer not null references public.users(id) on delete cascade,
  aws_session_id varchar(255) not null unique,
  status varchar(20) not null,
  liveness_confidence double precision,
  face_similarity double precision,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz
);

create index if not exists ix_face_verification_attempts_user_id
  on public.face_verification_attempts (user_id);

create index if not exists ix_face_verification_attempts_created_at
  on public.face_verification_attempts (created_at);

update public.alembic_version
set version_num = '20260930_0003';
```

Comprobar después con `select version_num from public.alembic_version;`. Debe devolver
`20260930_0003`; esto evita que una migración futura intente repetir los cambios aplicados
manualmente.

## 6. Variables del backend en Vercel

En el proyecto de Vercel que despliega **FastAPI**, abrir
**Settings > Environment Variables** y agregar para **Production**:

```dotenv
AWS_ACCESS_KEY_ID=<access key del usuario matrixflow-backend>
AWS_SECRET_ACCESS_KEY=<secret key del usuario matrixflow-backend>
AWS_FACE_LIVENESS_ENABLED=true
AWS_REGION=us-east-1
AWS_REKOGNITION_COLLECTION_ID=matrixflow-users
FACE_LIVENESS_THRESHOLD=90
FACE_MATCH_THRESHOLD=95
FACE_VERIFICATION_EXPIRE_MINUTES=3
FACE_MAX_ATTEMPTS=5
FACE_ATTEMPT_WINDOW_MINUTES=30
ALLOW_LEGACY_LOGIN=true
```

`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` deben guardarse como **Secret**. No usar
comillas, corchetes ni coma. Después, hacer **Redeploy** del backend.

## 7. Variables del frontend en Vercel

En el proyecto de Vercel que despliega **React/Vite**, agregar para **Production**:

```dotenv
VITE_AWS_REGION=us-east-1
VITE_AWS_COGNITO_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ALLOW_LEGACY_LOGIN=true
```

Estos dos valores son identificadores públicos de configuración; no son access keys.
Después, hacer **Redeploy** del frontend.

## 8. Registrar el rostro del usuario

1. Entrar temporalmente con correo y contraseña de administrador.
2. Abrir **Usuarios**.
3. Localizar el usuario que ya tiene su DNI real registrado.
4. Pulsar el botón de cámara.
5. Pulsar **Registrar con cámara** y permitir el acceso a la cámara.
6. Completar el desafío de prueba de vida. AWS entregará al backend un fotograma de
   referencia únicamente cuando la prueba resulte válida.
7. El backend indexará ese fotograma en la colección `matrixflow-users` y guardará el
   `FaceId` correspondiente en Supabase.
8. Confirmar que la fila muestre **Rostro registrado**.
9. Cerrar sesión.

La carga de una fotografía JPEG o PNG se conserva únicamente como alternativa
administrativa. El registro con cámara es el método recomendado porque valida que la
persona esté presente antes de crear la plantilla facial.

No escribir el `FaceId` en Supabase manualmente. El backend lo guarda después de que
AWS valida e indexa la fotografía.

## 9. Cerrar el acceso temporal con contraseña

Después de registrar al menos un administrador y comprobar que el acceso facial funciona:

1. En las variables del backend de Vercel cambiar `ALLOW_LEGACY_LOGIN=false`.
2. En las variables del frontend cambiar `VITE_ALLOW_LEGACY_LOGIN=false`.
3. Volver a desplegar backend y frontend.

Así, el formulario alternativo desaparece y el endpoint de contraseña también rechaza
el acceso. Para registrar nuevos rostros, un administrador ya autenticado puede hacerlo
desde **Usuarios** sin volver a habilitar la contraseña.

## 10. Prueba final

1. Abrir `/login` en el dominio del frontend.
2. Ingresar el DNI registrado.
3. Confirmar los datos personales mostrados.
4. Pulsar **Iniciar verificación facial** y permitir la cámara.
5. Completar el desafío de movimiento y luces.
6. El dashboard sólo se habilita si AWS confirma prueba de vida y coincidencia facial.

## Seguridad y costos

- No pulsar **Actualizar plan** en AWS si se desea conservar el plan gratuito.
- La colección y los permisos usan nombres exclusivos de MatrixFlow.
- Los intentos se limitan a cinco por usuario cada treinta minutos.
- Las sesiones de AWS son de un solo uso y expiran a los tres minutos.
- Los puntajes biométricos permanecen en el backend y no se muestran al navegador.
- Debe existir consentimiento y aviso de privacidad para procesar datos biométricos.
- AWS recomienda Face Liveness y la comparación facial como una segunda capa, no como el
  único sustituto de contraseña. Para producción real conviene añadir después un PIN u OTP;
  el flujo DNI + rostro implementado responde al prototipo solicitado.
