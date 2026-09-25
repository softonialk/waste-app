"use client";

import LegalPage, { type LegalSection } from "../components/legal-page";

const sections: LegalSection[] = [
  {
    title: "Households",
    titleSi: "නිවාස",
    body: (
      <ul>
        <li>Pickup requests are free. Give accurate details and only request pickups of sorted recyclable waste.</li>
        <li>Cancel a request you no longer need, and confirm a pickup only if it really happened.</li>
      </ul>
    ),
    bodySi: (
      <ul>
        <li>ඉල්ලීම් නොමිලේ. නිවැරදි තොරතුරු ලබා දී වෙන් කළ ප්‍රතිචක්‍රීකරණ කසළ සඳහා පමණක් ඉල්ලන්න.</li>
        <li>අවශ්‍ය නැති ඉල්ලීම් අවලංගු කරන්න, එකතු කිරීම සැබවින්ම සිදු වූවා නම් පමණක් තහවුරු කරන්න.</li>
      </ul>
    ),
  },
  {
    title: "Collectors",
    titleSi: "එකතු කරන්නන්",
    body: (
      <ul>
        <li>Only verified collectors can accept jobs. Keep your access key private.</li>
        <li>Record the real collected weight. Coins are credited only after the household or an administrator confirms the pickup.</li>
        <li>Coins have no cash value, cannot be transferred, and are redeemed only for the listed rewards.</li>
        <li>False records, fake requests or misuse of household details lead to suspension and forfeiture of coins.</li>
      </ul>
    ),
    bodySi: (
      <ul>
        <li>ඉල්ලීම් භාරගත හැක්කේ තහවුරු කළ එකතු කරන්නන්ට පමණි. ඔබේ access key එක රහසිගතව තබා ගන්න.</li>
        <li>සැබෑ බර සටහන් කරන්න. නිවස හෝ පරිපාලකයෙකු තහවුරු කළ පසුව පමණක් coins ලැබේ.</li>
        <li>Coins වලට මුදල් වටිනාකමක් නැත, මාරු කළ නොහැක, ලැයිස්තුගත ත්‍යාග සඳහා පමණක් මුදාගත හැක.</li>
        <li>ව්‍යාජ වාර්තා, ව්‍යාජ ඉල්ලීම් හෝ නිවාසවල තොරතුරු අනිසි ලෙස භාවිතය ගිණුම අත්හිටුවීමට සහ coins අහිමි වීමට හේතු වේ.</li>
      </ul>
    ),
  },
  {
    title: "The service",
    titleSi: "සේවාව",
    body: <p>EcoLoop connects households and independent collectors and does not guarantee that every request will be collected. District hub locations are planned locations until each hub opens. We may update these terms; the date above shows the latest version.</p>,
    bodySi: <p>EcoLoop නිවාස සහ ස්වාධීන එකතු කරන්නන් සම්බන්ධ කරන අතර සෑම ඉල්ලීමක්ම එකතු කරන බවට සහතික නොවේ. එක් එක් hub එක විවෘත වන තුරු දිස්ත්‍රික් hub ස්ථාන සැලසුම් කළ ස්ථාන වේ. මෙම කොන්දේසි යාවත්කාලීන විය හැක; ඉහත දිනය නවතම අනුවාදය පෙන්වයි.</p>,
  },
];

export default function TermsContent() {
  return <LegalPage title="Terms of Use" titleSi="භාවිත කොන්දේසි" updated="25 September 2026" sections={sections} />;
}
