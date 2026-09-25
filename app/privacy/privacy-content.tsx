import LegalPage, { type LegalSection } from "../components/legal-page";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

const sections: LegalSection[] = [
  {
    title: "Who we are",
    titleSi: "අප කවුද",
    body: <p>NextGen (www.nextgen.mom) connects households in Sri Lanka with verified collectors of sorted recyclable waste. This notice explains how we handle personal data under the Personal Data Protection Act, No. 9 of 2022.</p>,
    bodySi: <p>NextGen (www.nextgen.mom) ශ්‍රී ලංකාවේ නිවාස, වෙන් කළ ප්‍රතිචක්‍රීකරණ කසළ එකතු කරන තහවුරු කළ එකතු කරන්නන් සමඟ සම්බන්ධ කරයි. 2022 අංක 9 දරන පුද්ගලික දත්ත ආරක්ෂණ පනත යටතේ අප පුද්ගලික දත්ත හසුරුවන ආකාරය මෙම නිවේදනයෙන් පැහැදිලි කෙරේ.</p>,
  },
  {
    title: "What we collect",
    titleSi: "අප එකතු කරන දත්ත",
    body: (
      <ul>
        <li>Households: name, mobile number, pickup address, district, preferred date and time, notes, and the waste type and weight.</li>
        <li>Collectors: name, mobile number, district, service area and organization.</li>
        <li>A random device identifier stored in a cookie, so you can see your own requests without an account.</li>
        <li>Towns you type into the collection point search.</li>
      </ul>
    ),
    bodySi: (
      <ul>
        <li>නිවාස: නම, ජංගම අංකය, ලිපිනය, දිස්ත්‍රික්කය, කැමති දිනය සහ වේලාව, සටහන්, කසළ වර්ගය සහ බර.</li>
        <li>එකතු කරන්නන්: නම, ජංගම අංකය, දිස්ත්‍රික්කය, සේවා ප්‍රදේශය සහ ආයතනය.</li>
        <li>ගිණුමක් නොමැතිව ඔබේ ඉල්ලීම් බැලීමට cookie එකක ගබඩා කරන අහඹු උපාංග හඳුනාගැනීමක්.</li>
        <li>එකතු කිරීමේ ස්ථාන සෙවීමේදී ඔබ ලියන නගර.</li>
      </ul>
    ),
  },
  {
    title: "Why we use it",
    titleSi: "අප එය භාවිත කරන්නේ ඇයි",
    body: <p>Only to arrange and confirm pickups, verify collectors, deliver collector rewards, prevent abuse (for example with rate limits), and publish anonymous totals such as the number of completed pickups. We do not sell your data or use it for advertising.</p>,
    bodySi: <p>එකතු කිරීම් සංවිධානය කිරීමට සහ තහවුරු කිරීමට, එකතු කරන්නන් තහවුරු කිරීමට, ත්‍යාග ලබා දීමට, අපයෝජනය වැළැක්වීමට සහ සම්පූර්ණ කළ එකතු කිරීම් ගණන වැනි නිර්නාමික සංඛ්‍යා ප්‍රකාශ කිරීමට පමණි. අප ඔබේ දත්ත විකුණන්නේ හෝ දැන්වීම් සඳහා භාවිත කරන්නේ නැත.</p>,
  },
  {
    title: "Who can see it",
    titleSi: "එය බැලිය හැක්කේ කාටද",
    body: (
      <ul>
        <li>Open pickup requests show only the address, district, date and waste type to verified collectors.</li>
        <li>After a collector accepts your request, they see your name and phone number, and you see theirs.</li>
        <li>NextGen administrators can see all requests and collector details to run the service.</li>
      </ul>
    ),
    bodySi: (
      <ul>
        <li>විවෘත ඉල්ලීම්වල තහවුරු කළ එකතු කරන්නන්ට පෙන්වන්නේ ලිපිනය, දිස්ත්‍රික්කය, දිනය සහ කසළ වර්ගය පමණි.</li>
        <li>එකතු කරන්නෙක් ඔබේ ඉල්ලීම භාරගත් පසු ඔවුන්ට ඔබේ නම සහ දුරකථන අංකය පෙනේ, ඔබට ඔවුන්ගේ තොරතුරුද පෙනේ.</li>
        <li>සේවාව පවත්වාගෙන යාමට NextGen පරිපාලකයින්ට සියලු ඉල්ලීම් සහ එකතු කරන්නන්ගේ තොරතුරු බැලිය හැක.</li>
      </ul>
    ),
  },
  {
    title: "Service providers",
    titleSi: "සේවා සපයන්නන්",
    body: <p>Data is stored with MongoDB Atlas and the site is hosted on Vercel. Town searches are sent to OpenStreetMap Nominatim. The waste scanner downloads its model from jsDelivr and analyses the camera image only inside your browser; images are never uploaded.</p>,
    bodySi: <p>දත්ත MongoDB Atlas හි ගබඩා කෙරෙන අතර වෙබ් අඩවිය Vercel මත ක්‍රියාත්මක වේ. නගර සෙවීම් OpenStreetMap Nominatim වෙත යවයි. කසළ scanner එක jsDelivr වෙතින් model එක බාගත කර camera දසුන ඔබේ browser එක තුළ පමණක් විශ්ලේෂණය කරයි; පින්තූර කිසි විටෙක upload නොකෙරේ.</p>,
  },
  {
    title: "How long we keep it",
    titleSi: "අප එය තබා ගන්නා කාලය",
    body: <p>Pickup and collector records are kept while they are needed to run the service and settle rewards, and are deleted on request unless we must keep them to resolve a dispute. Rate-limit records expire automatically within a day and search results within 30 days.</p>,
    bodySi: <p>සේවාව පවත්වාගෙන යාමට සහ ත්‍යාග නිරවුල් කිරීමට අවශ්‍ය කාලය පුරා වාර්තා තබා ගන්නා අතර, ගැටලුවක් විසඳීමට අවශ්‍ය නොවන්නේ නම් ඉල්ලීම මත මකා දමනු ලැබේ. Rate-limit වාර්තා දිනක් ඇතුළත සහ සෙවුම් ප්‍රතිඵල දින 30ක් ඇතුළත ස්වයංක්‍රීයව මැකේ.</p>,
  },
  {
    title: "Your rights",
    titleSi: "ඔබේ අයිතිවාසිකම්",
    body: (
      <p>
        You may ask to access, correct or delete your personal data, or withdraw your consent, at any time.
        {contactEmail ? <> Contact us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</> : " Contact the NextGen team through your collector or pickup request."}
      </p>
    ),
    bodySi: (
      <p>
        ඔබේ පුද්ගලික දත්ත බැලීමට, නිවැරදි කිරීමට, මකා දැමීමට හෝ ඔබේ එකඟතාව ඉල්ලා අස්කර ගැනීමට ඕනෑම වේලාවක ඉල්ලිය හැක.
        {contactEmail ? <> අපව අමතන්න: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</> : " ඔබේ එකතු කරන්නා හෝ ඉල්ලීම හරහා NextGen කණ්ඩායම අමතන්න."}
      </p>
    ),
  },
  {
    title: "Cookies",
    titleSi: "Cookies",
    body: <p>We only use cookies that are needed for the site to work: to remember your pickup requests, and to keep collectors and administrators signed in. Your language choice is stored in your browser. We do not use tracking or advertising cookies.</p>,
    bodySi: <p>අප භාවිත කරන්නේ වෙබ් අඩවිය ක්‍රියා කිරීමට අවශ්‍ය cookies පමණි: ඔබේ ඉල්ලීම් මතක තබා ගැනීමට සහ එකතු කරන්නන් සහ පරිපාලකයින් පිවිසී සිටීමට. ඔබේ භාෂා තේරීම browser එකේ ගබඩා වේ. ලුහුබැඳීමේ හෝ දැන්වීම් cookies භාවිත නොකරයි.</p>,
  },
];

export default function PrivacyContent() {
  return <LegalPage title="Privacy Notice" titleSi="පෞද්ගලිකත්ව නිවේදනය" updated="25 September 2026" sections={sections} />;
}
